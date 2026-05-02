import SwiftUI
import PhotosUI
import AVFoundation

struct CreatePostView: View {
    let goalId: String
    @Environment(AuthViewModel.self) private var auth
    @Environment(FeedViewModel.self) private var feedVM
    @Environment(\.dismiss) private var dismiss

    @State private var capturedImage: UIImage?
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var isUploading = false
    @State private var showCamera = true
    @State private var useFrontCamera = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let image = capturedImage {
                reviewView(image: image)
            } else {
                cameraPlaceholderView
            }
        }
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    if capturedImage != nil {
                        capturedImage = nil
                    } else {
                        dismiss()
                    }
                } label: {
                    Image(systemName: "xmark")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }

    // MARK: - Camera Placeholder (Photo Picker)
    // Note: SwiftUI doesn't have a built-in camera view like Expo Camera.
    // We use PhotosPicker for gallery and a UIImagePickerController wrapper for camera.

    private var cameraPlaceholderView: some View {
        VStack(spacing: 24) {
            Spacer()

            // Camera preview area
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.05))
                .frame(height: UIScreen.main.bounds.width - 32)
                .overlay {
                    VStack(spacing: 16) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(.white.opacity(0.3))
                        Text("Take a photo or choose from library")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.4))
                    }
                }
                .padding(.horizontal, 16)

            // Camera Controls
            HStack(spacing: 32) {
                // Photo Library
                PhotosPicker(selection: $selectedPhoto, matching: .images) {
                    VStack(spacing: 4) {
                        Image(systemName: "photo.on.rectangle")
                            .font(.title2)
                            .foregroundStyle(.white.opacity(0.7))
                        Text("Library")
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .frame(width: 60, height: 60)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Circle())
                }
                .onChange(of: selectedPhoto) { _, newValue in
                    loadFromPicker(newValue)
                }

                // Camera button
                Button {
                    showCamera = true
                } label: {
                    Circle()
                        .fill(.white.opacity(0.3))
                        .frame(width: 80, height: 80)
                        .overlay {
                            Circle()
                                .fill(.white)
                                .frame(width: 70, height: 70)
                        }
                }
                .fullScreenCover(isPresented: $showCamera) {
                    CameraViewWrapper { image in
                        capturedImage = image
                        showCamera = false
                    } onCancel: {
                        showCamera = false
                    }
                    .ignoresSafeArea()
                }

                // Spacer for symmetry
                Color.clear
                    .frame(width: 60, height: 60)
            }

            Spacer()
        }
    }

    // MARK: - Review View

    private func reviewView(image: UIImage) -> some View {
        VStack(spacing: 0) {
            // Preview image
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: UIScreen.main.bounds.width - 32, height: UIScreen.main.bounds.width - 32)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 16)
                .padding(.top, 16)

            Spacer()

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal, 24)
            }

            // Actions
            HStack(spacing: 12) {
                Button {
                    capturedImage = nil
                } label: {
                    Text("Retake")
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.white.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(isUploading)

                Button {
                    Task { await handlePost(image: image) }
                } label: {
                    if isUploading {
                        ProgressView()
                            .tint(.black)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    } else {
                        Text("Post")
                            .font(.body)
                            .fontWeight(.semibold)
                            .foregroundStyle(.black)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                }
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .disabled(isUploading)
            }
            .padding(.horizontal, 40)
            .padding(.bottom, 40)
        }
    }

    // MARK: - Actions

    private func loadFromPicker(_ item: PhotosPickerItem?) {
        guard let item else { return }
        Task {
            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                capturedImage = image
            }
        }
    }

    private func handlePost(image: UIImage) async {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            errorMessage = "Failed to process image"
            return
        }

        isUploading = true
        errorMessage = nil

        do {
            _ = try await PostService.createPost(goalId: goalId, imageData: imageData)

            // Increment streak
            do {
                _ = try await GoalService.incrementStreak(goalId)
            } catch {
                // Post was created but streak failed — non-blocking
                print("Streak update failed: \(error)")
            }

            // Invalidate feed cache so it re-fetches when FeedView appears.
            // Avoid refreshing immediately — R2 images may not be available
            // at the CDN edge yet, and AsyncImage caches failed loads.
            feedVM.invalidate()
            try? await Task.sleep(for: .milliseconds(800))
            await feedVM.refresh()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isUploading = false
        }
    }
}

// MARK: - Camera Wrapper (UIImagePickerController)

struct CameraViewWrapper: UIViewControllerRepresentable {
    let onCapture: (UIImage) -> Void
    let onCancel: () -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraCaptureMode = .photo
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onCapture: onCapture, onCancel: onCancel)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onCapture: (UIImage) -> Void
        let onCancel: () -> Void

        init(onCapture: @escaping (UIImage) -> Void, onCancel: @escaping () -> Void) {
            self.onCapture = onCapture
            self.onCancel = onCancel
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                onCapture(image)
            }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onCancel()
        }
    }
}
