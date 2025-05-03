declare namespace NodeJS
{
    interface ProcessEnv
    {
        NODE_ENV: "prod" | "dev";
        PORT: string;
        PLAYER_CAP: string;
        REGISTRATIONS_OPEN: "true" | "false";
        IGNORE_VERSION: "true" | "false";
        SWEAR_FILTER: "true" | "false";
        CONSOLE_LOG: "true" | "false";
        REPORTS_WEBHOOK: string;
        SERVER_NAME: string;
        BLACKLISTED_USER_NAMES: string;
        BLACKLISTED_WORLD_NAMES: string;
        RECOVERY_MAILER_SERVICE: string;
        RECOVERY_MAILER_EMAIL: string;
        RECOVERY_MAILER_DISPLAY_EMAIL: string;
        RECOVERY_MAILER_PASSWORD: string;
    }
}