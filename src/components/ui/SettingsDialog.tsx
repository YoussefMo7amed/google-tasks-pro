/**
 * Settings Dialog
 * 
 * App-wide settings and AI Assistant configuration.
 * Supports persistent multi-provider configurations, multiple API keys per provider,
 * and seamless Primary & Backup agent assignment with one-click swapping.
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
  Chip,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Notifications,
  InfoOutlined,
  PeopleOutline,
  SmartToy,
  Visibility,
  VisibilityOff,
  CheckCircleOutline,
  Key,
  ShieldOutlined,
  SwapHoriz,
  Check,
  Star,
  Translate,
  DeleteOutline,
} from '@mui/icons-material';
import { trashService, TrashRetention } from '../../services/trash.service';
import { setCustomCredentials } from '../../config/credentials';
import { useTranslation } from '../../i18n';
import {
  loadSettings,
  saveSettings,
  getNotificationHourOptions,
  formatHour,
  AppSettings,
  TimeFormatPreference,
} from '../../services/settings.service';
import {
  AISettings,
  AIProviderType,
  ProviderConfig,
  DEFAULT_MODELS,
  DEFAULT_BASE_URLS,
  ALL_PROVIDERS,
  AISettingsService,
} from '../../services/ai/ai-settings.service';
import { aiService } from '../../services/ai/ai.service';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

const getProviderLabels = (language: string): Record<AIProviderType, string> => ({
  gemini: language === "ar" ? "Google Gemini (موصى به)" : "Google Gemini (Recommended)",
  openai_compatible: "OpenAI / OpenRouter / Groq",
  claude: "Anthropic Claude",
  ollama: language === "ar" ? "Ollama (محلي مفتوح المصدر)" : "Ollama (Local Open-Source)",
  lm_studio: language === "ar" ? "LM Studio (محلي مفتوح المصدر)" : "LM Studio (Local Open-Source)",
});

export default function SettingsDialog({ 
  open, 
  onClose,
  onSettingsChange,
}: SettingsDialogProps) {
  const { t, language, setLanguage, supportedLanguages } = useTranslation();
  const providerLabels = getProviderLabels(language);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [notificationHour, setNotificationHour] = useState<number>(9);
  const [timeFormat, setTimeFormat] = useState<TimeFormatPreference>('both');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Trash Settings state
  const [trashRetention, setTrashRetention] = useState<TrashRetention>(() => trashService.getSettings().retention);
  const [trashCustomDays, setTrashCustomDays] = useState<number>(() => trashService.getSettings().customDays || 7);

  // Custom Google OAuth Credentials state
  const [customClientId, setCustomClientId] = useState<string>(() => localStorage.getItem('custom_google_client_id') || '');
  const [customClientSecret, setCustomClientSecret] = useState<string>(() => localStorage.getItem('custom_google_client_secret') || '');

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<AISettings>(() => AISettingsService.load());
  const [selectedProviderTab, setSelectedProviderTab] = useState<AIProviderType>(() => aiSettings.provider || "gemini");
  const [showApiKey, setShowApiKey] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSettings()
        .then(settings => {
          setNotificationHour(settings.notificationHour);
          setTimeFormat(settings.timeFormat || 'both');
          setLoading(false);
        })
        .catch(() => setLoading(false));

      const loadedAI = AISettingsService.load();
      setAiSettings(loadedAI);
      setSelectedProviderTab(loadedAI.provider || "gemini");
      setTestResult(null);
      setNewKeyInput('');

      const currentTrash = trashService.getSettings();
      setTrashRetention(currentTrash.retention);
      setTrashCustomDays(currentTrash.customDays || 7);

      setCustomClientId(localStorage.getItem('custom_google_client_id') || '');
      setCustomClientSecret(localStorage.getItem('custom_google_client_secret') || '');
    }
  }, [open]);

  // Current provider configuration being viewed/edited
  const currentProviderConfig: ProviderConfig = aiSettings.providers?.[selectedProviderTab] || {
    provider: selectedProviderTab,
    apiKey: '',
    apiKeys: [],
    model: DEFAULT_MODELS[selectedProviderTab],
    baseUrl: DEFAULT_BASE_URLS[selectedProviderTab],
    temperature: 0.7,
  };

  const currentApiKeys = currentProviderConfig.apiKeys && currentProviderConfig.apiKeys.length > 0
    ? currentProviderConfig.apiKeys
    : (currentProviderConfig.apiKey ? [currentProviderConfig.apiKey] : []);

  const updateProviderConfig = (providerType: AIProviderType, patch: Partial<ProviderConfig>) => {
    setAiSettings((prev: AISettings) => {
      const providers = { ...(prev.providers || {}) } as Record<AIProviderType, ProviderConfig>;
      const existing = providers[providerType] || {
        provider: providerType,
        apiKey: '',
        apiKeys: [],
        model: DEFAULT_MODELS[providerType],
        baseUrl: DEFAULT_BASE_URLS[providerType],
        temperature: 0.7,
      };

      const updated: ProviderConfig = {
        ...existing,
        ...patch,
      };
      providers[providerType] = updated;

      const isPrimary = prev.provider === providerType;
      const isBackup = prev.backupProvider === providerType;

      return {
        ...prev,
        providers,
        ...(isPrimary
          ? {
              apiKey: updated.apiKey,
              apiKeys: updated.apiKeys,
              model: updated.model,
              baseUrl: updated.baseUrl,
              temperature: updated.temperature,
            }
          : {}),
        ...(isBackup
          ? {
              backupApiKey: updated.apiKey,
              backupApiKeys: updated.apiKeys,
              backupModel: updated.model,
              backupBaseUrl: updated.baseUrl,
            }
          : {}),
      };
    });
    setTestResult(null);
  };

  const handleAddKey = () => {
    const trimmed = newKeyInput.trim();
    if (!trimmed) return;
    if (currentApiKeys.includes(trimmed)) {
      setNewKeyInput('');
      return;
    }
    const updated = [...currentApiKeys, trimmed];
    updateProviderConfig(selectedProviderTab, {
      apiKeys: updated,
      apiKey: updated[0],
    });
    setNewKeyInput('');
  };

  const handleDeleteKey = (index: number) => {
    const updated = currentApiKeys.filter((_, i) => i !== index);
    updateProviderConfig(selectedProviderTab, {
      apiKeys: updated,
      apiKey: updated[0] || '',
    });
  };

  const handleSetActiveKey = (index: number) => {
    if (index === 0) return;
    const selected = currentApiKeys[index];
    const updated = [selected, ...currentApiKeys.filter((_, i) => i !== index)];
    updateProviderConfig(selectedProviderTab, {
      apiKeys: updated,
      apiKey: selected,
    });
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  // Swap Primary and Backup Roles
  const handleSwapRoles = () => {
    const oldPrimary = aiSettings.provider;
    const oldBackup = aiSettings.backupProvider || "openai_compatible";

    setAiSettings((prev: AISettings) => {
      const pConfig = prev.providers?.[oldBackup];
      const bConfig = prev.providers?.[oldPrimary];

      return {
        ...prev,
        provider: oldBackup,
        apiKey: pConfig?.apiKey || '',
        apiKeys: pConfig?.apiKeys || [],
        model: pConfig?.model || DEFAULT_MODELS[oldBackup],
        baseUrl: pConfig?.baseUrl || DEFAULT_BASE_URLS[oldBackup],
        backupProvider: oldPrimary,
        backupApiKey: bConfig?.apiKey || '',
        backupApiKeys: bConfig?.apiKeys || [],
        backupModel: bConfig?.model || DEFAULT_MODELS[oldPrimary],
        backupBaseUrl: bConfig?.baseUrl || DEFAULT_BASE_URLS[oldPrimary],
      };
    });

    setSelectedProviderTab(oldBackup);
    setTestResult(null);
  };

  const handleSetPrimary = (newPrimary: AIProviderType) => {
    setAiSettings((prev: AISettings) => {
      const pConfig = prev.providers?.[newPrimary];
      const newBackup = prev.backupProvider === newPrimary ? prev.provider : prev.backupProvider;
      const bConfig = prev.providers?.[newBackup || "openai_compatible"];

      return {
        ...prev,
        provider: newPrimary,
        apiKey: pConfig?.apiKey || '',
        apiKeys: pConfig?.apiKeys || [],
        model: pConfig?.model || DEFAULT_MODELS[newPrimary],
        baseUrl: pConfig?.baseUrl || DEFAULT_BASE_URLS[newPrimary],
        backupProvider: newBackup,
        backupApiKey: bConfig?.apiKey || '',
        backupApiKeys: bConfig?.apiKeys || [],
        backupModel: bConfig?.model || DEFAULT_MODELS[newBackup || "openai_compatible"],
        backupBaseUrl: bConfig?.baseUrl || DEFAULT_BASE_URLS[newBackup || "openai_compatible"],
      };
    });
    setTestResult(null);
  };

  const handleSetBackup = (newBackup: AIProviderType) => {
    setAiSettings((prev: AISettings) => {
      const bConfig = prev.providers?.[newBackup];
      return {
        ...prev,
        backupProvider: newBackup,
        backupApiKey: bConfig?.apiKey || '',
        backupApiKeys: bConfig?.apiKeys || [],
        backupModel: bConfig?.model || DEFAULT_MODELS[newBackup],
        backupBaseUrl: bConfig?.baseUrl || DEFAULT_BASE_URLS[newBackup],
      };
    });
    setTestResult(null);
  };

  const handleTestSelectedProvider = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await aiService.testProvider(selectedProviderTab, {
        apiKey: currentProviderConfig.apiKey || currentProviderConfig.apiKeys?.[0] || '',
        model: currentProviderConfig.model || DEFAULT_MODELS[selectedProviderTab],
        baseUrl: currentProviderConfig.baseUrl || DEFAULT_BASE_URLS[selectedProviderTab],
      });
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
      const updated = await saveSettings({ notificationHour, timeFormat });
      AISettingsService.save(aiSettings);
      trashService.updateSettings({
        retention: trashRetention,
        customDays: Math.max(1, Number(trashCustomDays) || 1),
      });
      setCustomCredentials(customClientId.trim(), customClientSecret.trim());
      onSettingsChange?.(updated);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const hourOptions = getNotificationHourOptions(language, timeFormat);
  const isCurrentLocal = selectedProviderTab === 'ollama' || selectedProviderTab === 'lm_studio';

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>{t("settings.title")}</Typography>
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
        <Tab icon={<Notifications sx={{ fontSize: 18 }} />} iconPosition="start" label={t("settings.generalTab")} />
        <Tab icon={<SmartToy sx={{ fontSize: 18 }} />} iconPosition="start" label={t("settings.aiTab")} />
      </Tabs>
      
      <DialogContent sx={{ pt: 3, minHeight: 460 }}>
        {loading ? (
          <Typography color="text.secondary">{t("common.loading")}</Typography>
        ) : activeTab === 0 ? (
          <Box>
            {/* Language Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Translate color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                {t("settings.language")}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("settings.languageDescription")}
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <InputLabel id="language-select-label">{t("settings.language")}</InputLabel>
              <Select
                labelId="language-select-label"
                value={language}
                label={t("settings.language")}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {supportedLanguages.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ my: 3 }} />

            {/* Notifications Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Notifications color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                {t("settings.dailyNotifications")}
              </Typography>
            </Box>
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="time-format-label">{t("settings.timeFormat")}</InputLabel>
              <Select
                labelId="time-format-label"
                value={timeFormat}
                label={t("settings.timeFormat")}
                onChange={(e) => setTimeFormat(e.target.value as TimeFormatPreference)}
              >
                <MenuItem value="both">{t("settings.timeFormatBoth")}</MenuItem>
                <MenuItem value="12h">{t("settings.timeFormat12h")}</MenuItem>
                <MenuItem value="24h">{t("settings.timeFormat24h")}</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="notification-hour-label">{t("settings.remindMeAt")}</InputLabel>
              <Select
                labelId="notification-hour-label"
                value={notificationHour}
                label={t("settings.remindMeAt")}
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
              {t("settings.notificationsNotice", { time: formatHour(notificationHour, language, timeFormat) })}
            </Typography>

            <Divider sx={{ my: 3 }} />

            {/* Trash Auto-Clean Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <DeleteOutline color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                {t("trash.autoCleanTitle")}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("trash.retentionLabel")}
            </Typography>

            <FormControl fullWidth size="small" sx={{ mb: trashRetention === "custom" ? 2 : 1 }}>
              <InputLabel id="trash-retention-label">{t("trash.autoCleanSettings")}</InputLabel>
              <Select
                labelId="trash-retention-label"
                value={trashRetention}
                label={t("trash.autoCleanSettings")}
                onChange={(e) => setTrashRetention(e.target.value as TrashRetention)}
              >
                <MenuItem value="1d">{t("trash.retention1Day")}</MenuItem>
                <MenuItem value="3d">{t("trash.retention3Days")}</MenuItem>
                <MenuItem value="7d">{t("trash.retention7Days")}</MenuItem>
                <MenuItem value="30d">{t("trash.retention30Days")}</MenuItem>
                <MenuItem value="custom">{t("trash.retentionCustom")}</MenuItem>
                <MenuItem value="never">{t("trash.retentionNever")}</MenuItem>
              </Select>
            </FormControl>

            {trashRetention === "custom" && (
              <TextField
                fullWidth
                size="small"
                type="number"
                label={t("trash.customDaysInput")}
                value={trashCustomDays}
                onChange={(e) => setTrashCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, max: 365 }}
                sx={{ mb: 1 }}
              />
            )}

            <Divider sx={{ my: 3 }} />

            {/* Google OAuth Credentials Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Key color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                {t("settings.customOAuthTitle")}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("settings.customOAuthDesc")}
            </Typography>

            <TextField
              fullWidth
              size="small"
              label={t("settings.customClientId")}
              value={customClientId}
              onChange={(e) => setCustomClientId(e.target.value)}
              placeholder="xxxx.apps.googleusercontent.com"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              size="small"
              type="password"
              label={t("settings.customClientSecret")}
              value={customClientSecret}
              onChange={(e) => setCustomClientSecret(e.target.value)}
              placeholder="GOCSPX-xxxx"
              sx={{ mb: 1 }}
            />

            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ display: 'block', mb: 1 }}
            >
              {t("settings.customOAuthNotice")}
            </Typography>

            <Divider sx={{ my: 3 }} />

            {/* About Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <InfoOutlined color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>
                {t("settings.about")}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {t("settings.aboutDesc")}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              <Link
                href="https://github.com/codad5/google-task-desktop"
                target="_blank"
                rel="noreferrer"
                underline="hover"
                color="primary"
              >
                {t("settings.viewOnGithub")}
              </Link>
            </Typography>

            {/* Contributors Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PeopleOutline color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>
                {t("settings.contributors")}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                size="small"
                label="codad5"
                component="a"
                href="https://github.com/codad5"
                target="_blank"
                clickable
                variant="outlined"
                sx={{ fontSize: '0.75rem', height: 26 }}
              />
              <Chip
                size="small"
                label="Youssef Mohamed"
                component="a"
                href="https://github.com/YoussefMo7amed"
                target="_blank"
                clickable
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.75rem', height: 26, fontWeight: 600 }}
              />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Top Card: Active Agents Roles & One-Click Swap */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartToy color="primary" sx={{ fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={700}>
                    {t("settings.activeAgentsAndBackup")}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {t("settings.activeAgentsSubtitle")}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                {/* Primary Agent Selector */}
                <Box sx={{ flex: 1, minWidth: 220 }}>
                  <Typography variant="caption" fontWeight={600} color="primary.main" sx={{ display: 'block', mb: 0.5 }}>
                    {t("settings.primaryAgent")}
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={aiSettings.provider}
                      onChange={(e) => handleSetPrimary(e.target.value as AIProviderType)}
                    >
                      {ALL_PROVIDERS.map((key) => {
                        const hasKeys = (aiSettings.providers?.[key]?.apiKeys?.length ?? 0) > 0 || Boolean(aiSettings.providers?.[key]?.apiKey);
                        const isLocal = key === 'ollama' || key === 'lm_studio';
                        return (
                          <MenuItem key={key} value={key}>
                            {providerLabels[key]} {hasKeys || isLocal ? '✓' : ''}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Box>

                {/* Swap Button */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2 }}>
                  <Tooltip title={t("settings.swapRolesTooltip")}>
                    <span>
                      <IconButton
                        onClick={handleSwapRoles}
                        color="primary"
                        sx={{
                          border: 1,
                          borderColor: 'primary.main',
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <SwapHoriz />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>

                {/* Backup Agent Selector */}
                <Box sx={{ flex: 1, minWidth: 220 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={600} color="secondary.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ShieldOutlined sx={{ fontSize: 15 }} /> {t("settings.backupAgent")}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={Boolean(aiSettings.backupEnabled)}
                          onChange={(e) =>
                            setAiSettings({ ...aiSettings, backupEnabled: e.target.checked })
                          }
                          color="secondary"
                        />
                      }
                      label={
                        <Typography variant="caption" color="text.secondary">
                          {aiSettings.backupEnabled ? t("settings.enabled") : t("settings.disabled")}
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  </Box>
                  <FormControl fullWidth size="small" disabled={!aiSettings.backupEnabled}>
                    <Select
                      value={aiSettings.backupProvider || "openai_compatible"}
                      onChange={(e) => handleSetBackup(e.target.value as AIProviderType)}
                    >
                      {ALL_PROVIDERS.map((key) => {
                        const hasKeys = (aiSettings.providers?.[key]?.apiKeys?.length ?? 0) > 0 || Boolean(aiSettings.providers?.[key]?.apiKey);
                        const isLocal = key === 'ollama' || key === 'lm_studio';
                        return (
                          <MenuItem key={key} value={key}>
                            {providerLabels[key]} {hasKeys || isLocal ? '✓' : ''}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>

            <Divider />

            {/* Provider Configuration Tabs */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                {t("settings.modelsAndKeysVault")}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {t("settings.modelsAndKeysVaultDesc")}
              </Typography>

              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs
                  value={selectedProviderTab}
                  onChange={(_, val) => {
                    setSelectedProviderTab(val);
                    setTestResult(null);
                    setNewKeyInput('');
                  }}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {ALL_PROVIDERS.map((prov) => {
                    const isPrimary = aiSettings.provider === prov;
                    const isBackup = aiSettings.backupEnabled && aiSettings.backupProvider === prov;
                    const hasKey = (aiSettings.providers?.[prov]?.apiKeys?.length ?? 0) > 0 || Boolean(aiSettings.providers?.[prov]?.apiKey);
                    const isLocal = prov === 'ollama' || prov === 'lm_studio';

                    return (
                      <Tab
                        key={prov}
                        value={prov}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <span>{prov === 'gemini' ? 'Gemini' : prov === 'openai_compatible' ? 'OpenAI / Groq' : prov === 'claude' ? 'Claude' : prov === 'ollama' ? 'Ollama' : 'LM Studio'}</span>
                            {isPrimary && (
                              <Chip size="small" label={t("settings.primaryBadge")} color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
                            )}
                            {isBackup && (
                              <Chip size="small" label={t("settings.backupBadge")} color="secondary" sx={{ height: 18, fontSize: '0.65rem' }} />
                            )}
                            {!isPrimary && !isBackup && (hasKey || isLocal) && (
                              <Check sx={{ fontSize: 14, color: 'success.main' }} />
                            )}
                          </Box>
                        }
                      />
                    );
                  })}
                </Tabs>
              </Box>

              {/* Selected Provider Form */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {providerLabels[selectedProviderTab]}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {aiSettings.provider !== selectedProviderTab && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<Star sx={{ fontSize: 16 }} />}
                        onClick={() => handleSetPrimary(selectedProviderTab)}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        {t("settings.setAsPrimary")}
                      </Button>
                    )}
                    {aiSettings.backupProvider !== selectedProviderTab && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<ShieldOutlined sx={{ fontSize: 16 }} />}
                        onClick={() => {
                          setAiSettings((prev) => ({ ...prev, backupEnabled: true }));
                          handleSetBackup(selectedProviderTab);
                        }}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        {t("settings.setAsBackup")}
                      </Button>
                    )}
                  </Box>
                </Box>

                <TextField
                  label={t("settings.modelName")}
                  size="small"
                  fullWidth
                  value={currentProviderConfig.model || ""}
                  onChange={(e) => updateProviderConfig(selectedProviderTab, { model: e.target.value })}
                  helperText={t("settings.suggestedDefault", { defaultModel: DEFAULT_MODELS[selectedProviderTab] })}
                />

                {/* Multiple API Keys Manager for this specific provider */}
                {!isCurrentLocal && (
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Key sx={{ fontSize: 16 }} /> {t("settings.savedKeys", { count: currentApiKeys.length })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t("settings.autoFallbackNotice")}
                      </Typography>
                    </Box>

                    {/* Display Saved Keys */}
                    {currentApiKeys.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                        {currentApiKeys.map((keyStr, idx) => (
                          <Chip
                            key={idx}
                            size="small"
                            label={`${idx === 0 ? t("settings.activeKeyPrefix") : ""}${maskKey(keyStr)}`}
                            color={idx === 0 ? "primary" : "default"}
                            variant={idx === 0 ? "filled" : "outlined"}
                            onClick={() => handleSetActiveKey(idx)}
                            onDelete={() => handleDeleteKey(idx)}
                            title={idx === 0 ? t("settings.primaryKeyTooltip") : t("settings.makeKeyActiveTooltip")}
                            sx={{ fontFamily: "monospace", fontSize: "0.75rem", cursor: "pointer" }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        {t("settings.noSavedKeysNotice")}
                      </Typography>
                    )}

                    {/* Add Key Field */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        placeholder={t("settings.enterApiKeyPlaceholder", { provider: selectedProviderTab })}
                        size="small"
                        fullWidth
                        type={showApiKey ? "text" : "password"}
                        value={newKeyInput}
                        onChange={(e) => setNewKeyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddKey();
                          }
                        }}
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
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleAddKey}
                        disabled={!newKeyInput.trim()}
                        sx={{ minWidth: 95, textTransform: "none" }}
                      >
                        {t("settings.addKey")}
                      </Button>
                    </Box>
                  </Box>
                )}

                <TextField
                  label={t("settings.baseUrl")}
                  size="small"
                  fullWidth
                  value={currentProviderConfig.baseUrl || ""}
                  onChange={(e) => updateProviderConfig(selectedProviderTab, { baseUrl: e.target.value })}
                  helperText={t("settings.defaultUrlHelper", { defaultUrl: DEFAULT_BASE_URLS[selectedProviderTab] })}
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
                    onClick={handleTestSelectedProvider}
                    disabled={testingConnection}
                    startIcon={testingConnection ? <CircularProgress size={16} /> : <CheckCircleOutline />}
                    sx={{ textTransform: 'none' }}
                  >
                    {testingConnection ? t("settings.testingConnection") : t("settings.testConnectionFor", { provider: selectedProviderTab })}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={loading || saving}
        >
          {saving ? t("common.loading") : t("settings.saveChanges")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
