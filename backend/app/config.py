from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Set ENVIRONMENT=production in .env when deploying — controls fail-loud behavior
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://streakd:streakd_password@db:5432/streakd"

    # JWT
    JWT_SECRET_KEY: str = "change-me-to-a-random-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Cloudflare R2
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "streakd"
    R2_PUBLIC_URL: str = ""

    # Notifications — Expo (legacy, for React Native app)
    EXPO_ACCESS_TOKEN: str = ""
    INTERNAL_API_SECRET: str = "change-me-to-a-random-secret"

    # Notifications — APNs (native iOS)
    APNS_KEY_ID: str = ""        # 10-char key ID from Apple Developer
    APNS_TEAM_ID: str = ""       # 10-char team ID from Apple Developer
    APNS_KEY_PATH: str = ""      # Path to .p8 private key file
    APNS_BUNDLE_ID: str = "social.streakd.app"
    APNS_USE_SANDBOX: bool = False  # Set to True only for development builds (Xcode debug)

    # RevenueCat (secret API key for server-side subscription verification)
    REVENUECAT_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    model_config = {"env_file": ".env", "extra": "ignore"}

    def validate_secrets(self) -> list[str]:
        """Return warnings for any secrets still using default values."""
        warnings = []
        if self.JWT_SECRET_KEY == "change-me-to-a-random-secret":
            warnings.append("JWT_SECRET_KEY is using the default value — set a secure random secret in .env")
        if self.INTERNAL_API_SECRET == "change-me-to-a-random-secret":
            warnings.append("INTERNAL_API_SECRET is using the default value — set a secure random secret in .env")
        if self.CORS_ORIGINS == ["*"]:
            warnings.append("CORS_ORIGINS is set to wildcard ['*'] — restrict to your domain(s) in production")
        return warnings

    def assert_production_safe(self) -> None:
        """Hard-fail startup if running in production with insecure defaults.
        Prevents accidental deployment with the published default secrets,
        which would mean any attacker can forge JWTs."""
        if self.ENVIRONMENT.lower() != "production":
            return
        problems = []
        if self.JWT_SECRET_KEY == "change-me-to-a-random-secret":
            problems.append("JWT_SECRET_KEY")
        if self.INTERNAL_API_SECRET == "change-me-to-a-random-secret":
            problems.append("INTERNAL_API_SECRET")
        if problems:
            raise RuntimeError(
                f"Refusing to start in production with default secrets: {', '.join(problems)}. "
                "Set real values in .env."
            )


settings = Settings()
settings.assert_production_safe()
