import { Box, Typography, Link } from "@mui/material";
import { useTranslation } from "../../i18n";

export default function DisclaimerBanner() {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        bgcolor: "rgba(255, 255, 255, 0.03)",
        borderBottom: 1,
        borderColor: "divider",
        py: 0.5,
        px: 2,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: "0.7rem" }}
      >
        {t("common.disclaimer")}
        <Link
          href="https://github.com/YoussefMo7amed/google-tasks-pro"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          underline="hover"
          sx={{ fontSize: "inherit" }}
        >
          {t("common.viewOnGitHub")}
        </Link>
      </Typography>
    </Box>
  );
}
