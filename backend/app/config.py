from pydantic_settings import BaseSettings


class Settings(BaseSettings):
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

    # Notifications
    EXPO_ACCESS_TOKEN: str = ""
    INTERNAL_API_SECRET: str = "change-me-to-a-random-secret"

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


settings = Settings()
