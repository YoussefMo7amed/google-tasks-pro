import { useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Button,
} from "@mui/material";
import { Logout, AutoAwesome } from "@mui/icons-material";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  attemptLogoutState,
  loggedInSelector,
  userProfileSelector,
} from "../../config/states";
import { aiCopilotOpenAtom } from "../../store";

export default function Header() {
  const loggedIn = useRecoilValue(loggedInSelector);
  const profile = useRecoilValue(userProfileSelector);
  const setAttemptLogout = useSetRecoilState(attemptLogoutState);
  const setAiCopilotOpen = useSetRecoilState(aiCopilotOpenAtom);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    setAttemptLogout(true);
    handleMenuClose();
  };

  if (!loggedIn || !profile) {
    return null;
  }

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "transparent",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          minHeight: "48px !important",
          py: 0.5,
          px: 2.5,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
          Tasks
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AutoAwesome sx={{ color: "primary.main", fontSize: "1.1rem" }} />}
            onClick={() => setAiCopilotOpen(true)}
            sx={{
              borderRadius: "18px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              borderColor: "divider",
              color: "text.primary",
              py: 0.4,
              px: 1.5,
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "action.hover",
              },
            }}
          >
            AI Copilot
            <Box
              component="span"
              sx={{
                ml: 1,
                px: 0.75,
                py: 0.1,
                bgcolor: "action.selected",
                borderRadius: 1,
                fontSize: "0.7rem",
                color: "text.secondary",
                fontWeight: 700,
              }}
            >
              ⌘K
            </Box>
          </Button>

          <IconButton onClick={handleMenuOpen} size="small">
            <Avatar
              sx={{ width: 28, height: 28 }}
              src={profile?.picture ?? ""}
              alt={profile?.name ?? "User"}
            >
              {profile?.name?.charAt(0) ?? "U"}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                mt: 1.5,
                minWidth: 200,
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem disabled>
              <Avatar
                src={profile?.picture ?? ""}
                sx={{ width: 32, height: 32, mr: 1.5 }}
              />
              <ListItemText
                primary={profile?.name}
                secondary={profile?.email}
                primaryTypographyProps={{ variant: "body2" }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Sign out" />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
