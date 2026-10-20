/**
 * Splash Screen Component
 * 
 * Displays a beautiful loading screen while the app initializes.
 */

import { useState, useEffect } from "react";
import { Box, Typography, Button, keyframes } from "@mui/material";
import { TaskAlt } from "@mui/icons-material";

// Pulse animation for the icon
const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
`;

// Fade in animation
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Loading dots animation
const loadingDots = keyframes`
  0%, 20% {
    content: '.';
  }
  40% {
    content: '..';
  }
  60%, 100% {
    content: '...';
  }
`;

interface SplashScreenProps {
  message?: string;
  onCancel?: () => void;
}

export default function SplashScreen({ message = "Loading", onCancel }: SplashScreenProps) {
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCancel(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        bgcolor: "background.default",
        gap: 3,
      }}
    >
      {/* Logo/Icon */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 80,
          height: 80,
          borderRadius: "50%",
          bgcolor: "primary.main",
          animation: `${pulse} 2s ease-in-out infinite`,
        }}
      >
        <TaskAlt sx={{ fontSize: 48, color: "primary.contrastText" }} />
      </Box>

      {/* App Name */}
      <Typography
        variant="h4"
        fontWeight={600}
        sx={{
          animation: `${fadeIn} 0.5s ease-out`,
          background: "linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC04 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Google Tasks
      </Typography>

      {/* Loading Message */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          animation: `${fadeIn} 0.5s ease-out 0.2s both`,
          "&::after": {
            content: "'...'",
            animation: `${loadingDots} 1.5s steps(3, end) infinite`,
          },
        }}
      >
        {message}
      </Typography>

      {/* Cancel button if loading is taking more than a couple of seconds */}
      {showCancel && onCancel && (
        <Button
          variant="text"
          size="small"
          onClick={onCancel}
          sx={{
            color: "text.secondary",
            fontSize: "0.8rem",
            textTransform: "none",
            animation: `${fadeIn} 0.3s ease-out`,
            "&:hover": {
              color: "text.primary",
              backgroundColor: "action.hover",
            },
          }}
        >
          Cancel and return to login
        </Button>
      )}

    </Box>
  );
}
