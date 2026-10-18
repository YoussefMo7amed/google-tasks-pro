/**
 * Settings Dialog
 * 
 * App-wide settings and AI Assistant configuration.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Divider,
  IconButton,
  Link,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Close,
  Notifications,
  InfoOutlined,
  SmartToy,
  Visibility,
  VisibilityOff,
  CheckCircleOutline,
} from '@mui/icons-material';
import {
  loadSettings,
  saveSettings,
  getNotificationHourOptions,
  formatHour,
  AppSettings,
} from '../../services/settings.service';
import {
  AISettings,
  AIProviderType,
  PROVIDER_LABELS,
  DEFAULT_MODELS,
  DEFAULT_BASE_URLS,
  AISettingsService,
} from '../../services/ai/ai-settings.service';
import { aiService } from '../../services/ai/ai.service';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

export default function SettingsDialog({ 
  open, 
  onClose,
  onSettingsChange,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [notificationHour, setNotificationHour] = useState<number>(9);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<AISettings>(() => AISettingsService.load());
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSettings()
        .then(settings => {
          setNotificationHour(settings.notificationHour);
          setLoading(false);
        })
        .catch(() => setLoading(false));

      setAiSettings(AISettingsService.load());
      setTestResult(null);
    }
  }, [open]);

  const handleProviderChange = (newProvider: AIProviderType) => {
    setAiSettings((prev: AISettings) => ({
      ...prev,
      provider: newProvider,
      model: DEFAULT_MODELS[newProvider] || prev.model,
      baseUrl: DEFAULT_BASE_URLS[newProvider] || prev.baseUrl,
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await aiService.testConnection(aiSettings);
      setTestResult(res);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setTestResult({ success: false, message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await saveSettings({ notificationHour });
      AISettingsService.save(aiSettings);
      onSettingsChange?.(updated);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const hourOptions = getNotificationHourOptions();
  const isLocalProvider = aiSettings.provider === 'ollama' || aiSettings.provider === 'lm_studio';

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>Settings & Integrations</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
      >
        <Tab icon={<Notifications sx={{ fontSize: 18 }} />} iconPosition="start" label="General" />
        <Tab icon={<SmartToy sx={{ fontSize: 18 }} />} iconPosition="start" label="AI Assistant" />
      </Tabs>
      
      <DialogContent sx={{ pt: 3, minHeight: 340 }}>
        {loading ? (
          <Typography color="text.secondary">Loading settings...</Typography>
        ) : activeTab === 0 ? (
          <Box>
            {/* Notifications Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Notifications color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Daily Notifications
              </Typography>
            </Box>
            
            <FormControl fullWidth size="small">
              <InputLabel id="notification-hour-label">Remind me at</InputLabel>
              <Select
                labelId="notification-hour-label"
                value={notificationHour}
                label="Remind me at"
                onChange={(e) => setNotificationHour(e.target.value as number)}
              >
                {hourOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ display: 'block', mt: 1 }}
            >
              Notifications will be sent at {formatHour(notificationHour)} on the task's due date.
            </Typography>

            <Divider sx={{ my: 3 }} />

            {/* About Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <InfoOutlined color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>
                About
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Google Tasks Desktop • Open-source desktop client with AI Copilot & Offline Sync
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <Link
                href="https://github.com/codad5/google-task-desktop"
                target="_blank"
                rel="noreferrer"
                underline="hover"
                color="primary"
              >
                View on GitHub
              </Link>
              {" • Built by "}
              <Link
                href="https://codad5.me"
                target="_blank"
                rel="noreferrer"
                underline="hover"
                color="text.secondary"
              >
                codad5
              </Link>
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                AI Copilot Provider
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Connect your preferred AI model to organize tasks, break down complex goals, and auto-prioritize with Eisenhower Matrix.
              </Typography>
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel id="ai-provider-label">Provider</InputLabel>
              <Select
                labelId="ai-provider-label"
                value={aiSettings.provider}
                label="Provider"
                onChange={(e) => handleProviderChange(e.target.value as AIProviderType)}
              >
                {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Model Name"
              size="small"
              fullWidth
              value={aiSettings.model}
              onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
              helperText={`Suggested default: ${DEFAULT_MODELS[aiSettings.provider as AIProviderType]}`}
            />

            <TextField
              label={isLocalProvider ? "API Key (Optional for Local)" : "API Key"}
              size="small"
              fullWidth
              type={showApiKey ? "text" : "password"}
              value={aiSettings.apiKey}
              onChange={(e) => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
              placeholder={isLocalProvider ? "None required" : "Enter your API key..."}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Base URL"
              size="small"
              fullWidth
              value={aiSettings.baseUrl || ""}
              onChange={(e) => setAiSettings({ ...aiSettings, baseUrl: e.target.value })}
              helperText={`Default: ${DEFAULT_BASE_URLS[aiSettings.provider as AIProviderType]}`}
            />

            {testResult && (
              <Alert severity={testResult.success ? "success" : "error"} sx={{ mt: 1 }}>
                {testResult.message}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleTestConnection}
                disabled={testingConnection}
                startIcon={testingConnection ? <CircularProgress size={16} /> : <CheckCircleOutline />}
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={loading || saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
