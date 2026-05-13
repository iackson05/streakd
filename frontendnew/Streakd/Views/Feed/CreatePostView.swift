import SwiftUI
import AVFoundation

struct CreatePostView: View {
    let goalId: String
    @Environment(AuthViewModel.self) private var auth
    @Environment(FeedViewModel.self) private var feedVM
    @Environment(\.dismiss) private var dismiss

    @State private var capturedImage: UIImage?
    @State private var isUploading = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let image = capturedImage {
                reviewView(image: image)
            } else {
                CameraView { image in
                    capturedImage = image
                }
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

    // MARK: - Review View

    private func reviewView(image: UIImage) -> some View {
        VStack(spacing: 0) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(maxWidth: .infinity)
                .frame(height: 350)
                .clipped()
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

    private func handlePost(image: UIImage) async {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            errorMessage = "Failed to process image"
            return
        }

        isUploading = true
        errorMessage = nil

        do {
            _ = try await PostService.createPost(goalId: goalId, imageData: imageData)

            do {
                _ = try await GoalService.incrementStreak(goalId)
            } catch {
                print("Streak update failed: \(error)")
            }

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

// MARK: - Custom AVFoundation Camera

struct CameraView: View {
    let onCapture: (UIImage) -> Void

    @State private var flashMode: AVCaptureDevice.FlashMode = .off
    @State private var usingFrontCamera = false
    @State private var currentZoom: CGFloat = 1.0
    @State private var lastZoomScale: CGFloat = 1.0

    @StateObject private var camera = CameraController()

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            CameraPreviewView(session: camera.session)
                .frame(maxWidth: .infinity)
                .frame(height: 350)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 16)
                .gesture(
                    MagnifyGesture()
                        .onChanged { value in
                            let newZoom = lastZoomScale * value.magnification
                            currentZoom = min(max(newZoom, 1.0), camera.maxZoom)
                            camera.setZoom(currentZoom)
                        }
                        .onEnded { _ in
                            lastZoomScale = currentZoom
                        }
                )

            Spacer()

            // Controls: flip | shutter | flash
            HStack {
                Button {
                    usingFrontCamera.toggle()
                    currentZoom = 1.0
                    lastZoomScale = 1.0
                    camera.switchCamera(toFront: usingFrontCamera)
                } label: {
                    Image(systemName: "camera.rotate")
                        .font(.title2)
                        .foregroundStyle(.white)
                        .frame(width: 50, height: 50)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Circle())
                }

                Spacer()

                Button {
                    camera.capturePhoto(flashMode: flashMode) { image in
                        onCapture(image)
                    }
                } label: {
                    Circle()
                        .fill(.white.opacity(camera.isSessionRunning ? 0.3 : 0.1))
                        .frame(width: 80, height: 80)
                        .overlay {
                            Circle()
                                .fill(camera.isSessionRunning ? .white : .white.opacity(0.3))
                                .frame(width: 70, height: 70)
                        }
                }
                .disabled(!camera.isSessionRunning)

                Spacer()

                Button {
                    switch flashMode {
                    case .off: flashMode = .on
                    case .on: flashMode = .auto
                    default: flashMode = .off
                    }
                } label: {
                    Image(systemName: flashIconName)
                        .font(.title2)
                        .foregroundStyle(flashMode == .off ? .white.opacity(0.5) : .yellow)
                        .frame(width: 50, height: 50)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 40)
            .padding(.bottom, 40)
        }
        .onAppear {
            camera.start()
        }
        .onDisappear {
            camera.stop()
        }
    }

    private var flashIconName: String {
        switch flashMode {
        case .on: return "bolt.fill"
        case .auto: return "bolt.badge.automatic.fill"
        default: return "bolt.slash.fill"
        }
    }
}

// MARK: - Camera Controller (AVFoundation)

class CameraController: NSObject, ObservableObject {
    let session = AVCaptureSession()
    private var photoOutput = AVCapturePhotoOutput()
    private var currentDevice: AVCaptureDevice?
    private var captureCompletion: ((UIImage) -> Void)?
    private let sessionQueue = DispatchQueue(label: "camera.session")
    @Published var isSessionRunning = false

    var maxZoom: CGFloat {
        min(currentDevice?.activeFormat.videoMaxZoomFactor ?? 5.0, 10.0)
    }

    func start() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.configureSession(useFront: false)
            self.session.startRunning()
            DispatchQueue.main.async {
                self.isSessionRunning = self.session.isRunning
            }
        }
    }

    func stop() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.session.stopRunning()
            DispatchQueue.main.async {
                self.isSessionRunning = false
            }
        }
    }

    func switchCamera(toFront: Bool) {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.configureSession(useFront: toFront)
        }
    }

    func setZoom(_ factor: CGFloat) {
        guard let device = currentDevice else { return }
        let clamped = min(max(factor, 1.0), device.activeFormat.videoMaxZoomFactor)
        try? device.lockForConfiguration()
        device.videoZoomFactor = clamped
        device.unlockForConfiguration()
    }

    func capturePhoto(flashMode: AVCaptureDevice.FlashMode, completion: @escaping (UIImage) -> Void) {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            guard let connection = self.photoOutput.connection(with: .video),
                  connection.isActive else { return }
            self.captureCompletion = completion
            let settings = AVCapturePhotoSettings()
            if self.photoOutput.supportedFlashModes.contains(flashMode) {
                settings.flashMode = flashMode
            }
            self.photoOutput.capturePhoto(with: settings, delegate: self)
        }
    }

    private func configureSession(useFront: Bool) {
        session.beginConfiguration()
        session.inputs.forEach { session.removeInput($0) }

        let position: AVCaptureDevice.Position = useFront ? .front : .back
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position),
              let input = try? AVCaptureDeviceInput(device: device) else {
            session.commitConfiguration()
            return
        }

        if session.canAddInput(input) {
            session.addInput(input)
        }

        if session.outputs.isEmpty, session.canAddOutput(photoOutput) {
            session.addOutput(photoOutput)
        }

        currentDevice = device
        session.commitConfiguration()
    }
}

extension CameraController: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(),
              let image = UIImage(data: data) else { return }
        DispatchQueue.main.async { [weak self] in
            self?.captureCompletion?(image)
            self?.captureCompletion = nil
        }
    }
}

// MARK: - Camera Preview (UIViewRepresentable)

struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> CameraPreviewUIView {
        let view = CameraPreviewUIView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: CameraPreviewUIView, context: Context) {}
}

class CameraPreviewUIView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }

    var previewLayer: AVCaptureVideoPreviewLayer {
        layer as! AVCaptureVideoPreviewLayer
    }
}
