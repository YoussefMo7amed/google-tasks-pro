import { useState, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  IconButton,
  Chip,
  Popover,
  Typography,
  Select,
  MenuItem,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import {
  EditOutlined,
  Today,
  CalendarMonth,
  AccessTime,
  Repeat,
} from "@mui/icons-material";
import { useTranslation } from "../../i18n";
import { formatLocalizedDueDate } from "../../i18n/dateUtils";
import { applyQuadrantToTitle, QuadrantType } from "../../services/history.service";
import { RecurrenceRule, RecurrenceFrequency, RecurrenceEndType } from "../../types/app";

interface AddTaskInputProps {
  onAdd: (
    title: string,
    dueDate?: Date,
    notes?: string,
    exactTime?: string,
    recurrence?: RecurrenceRule
  ) => void;
}

const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS_SHORT_AR = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

export default function AddTaskInput({ onAdd }: AddTaskInputProps) {
  const { t, language, isRtl } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [quadrant, setQuadrant] = useState<QuadrantType | null>(null);
  const [exactTime, setExactTime] = useState<string>("");

  // Recurrence state
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [repeatFreq, setRepeatFreq] = useState<RecurrenceFrequency>("weekly");
  const [repeatInterval, setRepeatInterval] = useState<number>(1);
  const [repeatDays, setRepeatDays] = useState<number[]>([5]); // Default Friday
  const [repeatEndType, setRepeatEndType] = useState<RecurrenceEndType>("never");
  const [repeatEndDate, setRepeatEndDate] = useState<string>("");
  const [repeatEndCount, setRepeatEndCount] = useState<number>(10);

  // Popover anchors
  const [dateAnchorEl, setDateAnchorEl] = useState<HTMLElement | null>(null);
  const [timeAnchorEl, setTimeAnchorEl] = useState<HTMLElement | null>(null);
  const [repeatAnchorEl, setRepeatAnchorEl] = useState<HTMLElement | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleReset = () => {
    setTaskTitle("");
    setTaskDetails("");
    setDueDate(null);
    setQuadrant(null);
    setExactTime("");
    setRecurrence(null);
    setIsExpanded(false);
  };

  const handleAdd = () => {
    if (taskTitle.trim()) {
      const finalTitle = quadrant
        ? applyQuadrantToTitle(taskTitle.trim(), quadrant)
        : taskTitle.trim();

      onAdd(
        finalTitle,
        dueDate || undefined,
        taskDetails.trim() || undefined,
        exactTime || undefined,
        recurrence || undefined
      );
      handleReset();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Escape") {
      handleReset();
    }
  };

  const handleSetToday = () => {
    const today = new Date();
    today.setHours(23, 59, 0, 0);
    setDueDate(today);
  };

  const handleSetTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    setDueDate(tomorrow);
  };

  const handleQuadrantClick = (q: QuadrantType) => {
    setQuadrant((prev) => (prev === q ? null : q));
  };

  const handleDayOfWeekToggle = (dayIndex: number) => {
    setRepeatDays((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.length > 1 ? prev.filter((d) => d !== dayIndex) : prev;
      }
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  const handleSaveRepeat = () => {
    const rule: RecurrenceRule = {
      frequency: repeatFreq,
      interval: Math.max(1, repeatInterval),
      daysOfWeek: repeatFreq === "weekly" ? repeatDays : undefined,
      time: exactTime || undefined,
      endType: repeatEndType,
      endDate: repeatEndType === "on_date" ? repeatEndDate : undefined,
      endCount: repeatEndType === "after_occurrences" ? repeatEndCount : undefined,
    };
    setRecurrence(rule);
    if (!dueDate) {
      handleSetToday();
    }
    setRepeatAnchorEl(null);
  };

  if (!isExpanded) {
    return (
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Button
          data-add-task-btn="true"
          startIcon={<EditOutlined sx={{ fontSize: 18 }} />}
          onClick={handleExpand}
          sx={{
            textTransform: "none",
            color: "primary.main",
            justifyContent: "flex-start",
            fontWeight: 500,
            "&:hover": {
              bgcolor: "transparent",
            },
          }}
          size="small"
        >
          {t("tasks.addTask")}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
      {/* Title Input */}
      <TextField
        fullWidth
        size="small"
        placeholder={t("tasks.taskTitlePlaceholder")}
        value={taskTitle}
        onChange={(e) => setTaskTitle(e.target.value)}
        onKeyDown={handleKeyPress}
        inputRef={inputRef}
        variant="standard"
        InputProps={{
          disableUnderline: true,
        }}
        inputProps={{ dir: "auto" }}
        sx={{
          "& .MuiInputBase-input": {
            py: 0.5,
            fontSize: "0.95rem",
            fontWeight: 600,
            unicodeBidi: "plaintext",
          },
        }}
      />

      {/* Details Input */}
      <TextField
        fullWidth
        size="small"
        placeholder={t("tasks.taskDetailsPlaceholder")}
        value={taskDetails}
        onChange={(e) => setTaskDetails(e.target.value)}
        onKeyDown={handleKeyPress}
        variant="standard"
        multiline
        maxRows={3}
        InputProps={{
          disableUnderline: true,
          startAdornment: (
            <Box sx={{ mr: 1, color: "text.secondary", display: "flex", alignItems: "center" }}>
              ≡
            </Box>
          ),
        }}
        inputProps={{ dir: "auto" }}
        sx={{
          mt: 0.75,
          "& .MuiInputBase-input": {
            py: 0.5,
            fontSize: "0.85rem",
            unicodeBidi: "plaintext",
          },
        }}
      />

      {/* Eisenhower Matrix Quadrants (One-Click Selection) */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1.25, flexWrap: "wrap" }}>
        <Chip
          label="🔴 Q1"
          size="small"
          onClick={() => handleQuadrantClick("Q1")}
          color={quadrant === "Q1" ? "error" : "default"}
          variant={quadrant === "Q1" ? "filled" : "outlined"}
          sx={{
            height: 24,
            fontSize: "0.75rem",
            fontWeight: quadrant === "Q1" ? 700 : 500,
            borderRadius: "6px",
            borderColor: quadrant === "Q1" ? "error.main" : "divider",
          }}
        />
        <Chip
          label="🔵 Q2"
          size="small"
          onClick={() => handleQuadrantClick("Q2")}
          color={quadrant === "Q2" ? "primary" : "default"}
          variant={quadrant === "Q2" ? "filled" : "outlined"}
          sx={{
            height: 24,
            fontSize: "0.75rem",
            fontWeight: quadrant === "Q2" ? 700 : 500,
            borderRadius: "6px",
            borderColor: quadrant === "Q2" ? "primary.main" : "divider",
          }}
        />
        <Chip
          label="🟡 Q3"
          size="small"
          onClick={() => handleQuadrantClick("Q3")}
          color={quadrant === "Q3" ? "warning" : "default"}
          variant={quadrant === "Q3" ? "filled" : "outlined"}
          sx={{
            height: 24,
            fontSize: "0.75rem",
            fontWeight: quadrant === "Q3" ? 700 : 500,
            borderRadius: "6px",
            borderColor: quadrant === "Q3" ? "warning.main" : "divider",
          }}
        />
        <Chip
          label="⚪ Q4"
          size="small"
          onClick={() => handleQuadrantClick("Q4")}
          variant={quadrant === "Q4" ? "filled" : "outlined"}
          sx={{
            height: 24,
            fontSize: "0.75rem",
            fontWeight: quadrant === "Q4" ? 700 : 500,
            borderRadius: "6px",
            borderColor: "divider",
            bgcolor: quadrant === "Q4" ? "rgba(255,255,255,0.2)" : undefined,
          }}
        />
      </Box>

      {/* Date, Time, and Repeat Row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
        {/* Quick Date Chips */}
        <Chip
          label={t("tasks.today")}
          size="small"
          onClick={handleSetToday}
          variant={dueDate?.toDateString() === new Date().toDateString() ? "filled" : "outlined"}
          color={dueDate?.toDateString() === new Date().toDateString() ? "primary" : "default"}
          sx={{ height: 26, borderRadius: "6px" }}
        />
        <Chip
          label={t("tasks.tomorrow")}
          size="small"
          onClick={handleSetTomorrow}
          variant={
            dueDate?.toDateString() ===
            new Date(Date.now() + 86400000).toDateString()
              ? "filled"
              : "outlined"
          }
          color={
            dueDate?.toDateString() ===
            new Date(Date.now() + 86400000).toDateString()
              ? "primary"
              : "default"
          }
          sx={{ height: 26, borderRadius: "6px" }}
        />
        <IconButton
          size="small"
          onClick={(e) => setDateAnchorEl(e.currentTarget)}
          sx={{ border: 1, borderColor: "divider", p: "3px" }}
        >
          <CalendarMonth sx={{ fontSize: 18 }} />
        </IconButton>

        {/* Exact Time Button/Chip */}
        <Chip
          icon={<AccessTime sx={{ fontSize: 16 }} />}
          label={exactTime ? exactTime : t("tasks.time")}
          size="small"
          onClick={(e) => setTimeAnchorEl(e.currentTarget)}
          onDelete={exactTime ? () => setExactTime("") : undefined}
          color={exactTime ? "info" : "default"}
          variant={exactTime ? "filled" : "outlined"}
          sx={{ height: 26, borderRadius: "6px" }}
        />

        {/* Repeat Button/Chip */}
        <Chip
          icon={<Repeat sx={{ fontSize: 16 }} />}
          label={recurrence ? t("tasks.repeats") : t("tasks.repeats")}
          size="small"
          onClick={(e) => setRepeatAnchorEl(e.currentTarget)}
          onDelete={recurrence ? () => setRecurrence(null) : undefined}
          color={recurrence ? "secondary" : "default"}
          variant={recurrence ? "filled" : "outlined"}
          sx={{ height: 26, borderRadius: "6px" }}
        />

        {/* Selected Date Indicator */}
        {dueDate && (
          <Chip
            icon={<Today sx={{ fontSize: 16 }} />}
            label={formatLocalizedDueDate(dueDate, language, t)?.label}
            size="small"
            onDelete={() => setDueDate(null)}
            color="primary"
            variant="outlined"
            sx={{ height: 26, borderRadius: "6px", ...(isRtl ? { mr: "auto" } : { ml: "auto" }) }}
          />
        )}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5, gap: 1 }}>
        <Button
          size="small"
          onClick={handleReset}
          sx={{ textTransform: "none" }}
        >
          {t("common.cancel")}
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={!taskTitle.trim()}
          onClick={handleAdd}
          sx={{ textTransform: "none" }}
        >
          {t("common.save")}
        </Button>
      </Box>

      {/* Date Picker Popover */}
      <Popover
        open={Boolean(dateAnchorEl)}
        anchorEl={dateAnchorEl}
        onClose={() => setDateAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <TextField
            type="date"
            fullWidth
            size="small"
            value={dueDate ? dueDate.toISOString().split("T")[0] : ""}
            onChange={(e) => {
              if (e.target.value) {
                const newDate = new Date(e.target.value);
                newDate.setHours(23, 59, 0, 0);
                setDueDate(newDate);
                setDateAnchorEl(null);
              }
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Popover>

      {/* Time Picker Popover */}
      <Popover
        open={Boolean(timeAnchorEl)}
        anchorEl={timeAnchorEl}
        onClose={() => setTimeAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 220 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {t("tasks.setTime")}
          </Typography>
          <TextField
            type="time"
            fullWidth
            size="small"
            value={exactTime}
            onChange={(e) => setExactTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            {exactTime && (
              <Button size="small" onClick={() => { setExactTime(""); setTimeAnchorEl(null); }}>
                {t("tasks.clearTime")}
              </Button>
            )}
            <Button size="small" variant="contained" onClick={() => setTimeAnchorEl(null)}>
              {t("common.save")}
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Repeats Popover (Similar to Mobile View) */}
      <Popover
        open={Boolean(repeatAnchorEl)}
        anchorEl={repeatAnchorEl}
        onClose={() => setRepeatAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2.5, width: 300, display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t("tasks.repeats")}
          </Typography>

          {/* Repeat every [interval] [frequency] */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="body2" sx={{ minWidth: 50, color: "text.secondary" }}>
              {t("tasks.repeatEvery")}
            </Typography>
            <TextField
              type="number"
              size="small"
              value={repeatInterval}
              onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ width: 70 }}
              inputProps={{ min: 1 }}
            />
            <FormControl size="small" sx={{ flex: 1 }}>
              <Select
                value={repeatFreq}
                onChange={(e) => setRepeatFreq(e.target.value as RecurrenceFrequency)}
              >
                <MenuItem value="daily">{t("tasks.daily")}</MenuItem>
                <MenuItem value="weekly">{t("tasks.weekly")}</MenuItem>
                <MenuItem value="monthly">{t("tasks.monthly")}</MenuItem>
                <MenuItem value="yearly">{t("tasks.yearly")}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Days of week (if weekly) */}
          {repeatFreq === "weekly" && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 0.5, mt: 0.5 }}>
                {(language === "ar" ? DAYS_SHORT_AR : DAYS_SHORT).map((dayName, index) => {
                  const isSelected = repeatDays.includes(index);
                  return (
                    <Button
                      key={dayName + index}
                      size="small"
                      variant={isSelected ? "contained" : "outlined"}
                      onClick={() => handleDayOfWeekToggle(index)}
                      sx={{
                        minWidth: 32,
                        width: 32,
                        height: 32,
                        p: 0,
                        borderRadius: "50%",
                        fontSize: "0.8rem",
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      {dayName}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Ends Condition */}
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              {t("tasks.ends")}
            </Typography>
            <RadioGroup
              value={repeatEndType}
              onChange={(e) => setRepeatEndType(e.target.value as RecurrenceEndType)}
              sx={{ mt: 0.5 }}
            >
              <FormControlLabel
                value="never"
                control={<Radio size="small" />}
                label={<Typography variant="body2">{t("tasks.never")}</Typography>}
              />
              <FormControlLabel
                value="on_date"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2">{t("tasks.onDate")}</Typography>
                    {repeatEndType === "on_date" && (
                      <TextField
                        type="date"
                        size="small"
                        value={repeatEndDate}
                        onChange={(e) => setRepeatEndDate(e.target.value)}
                        sx={{ width: 140 }}
                      />
                    )}
                  </Box>
                }
              />
              <FormControlLabel
                value="after_occurrences"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2">{t("tasks.afterOccurrences")}</Typography>
                    {repeatEndType === "after_occurrences" && (
                      <TextField
                        type="number"
                        size="small"
                        value={repeatEndCount}
                        onChange={(e) => setRepeatEndCount(Math.max(1, parseInt(e.target.value) || 1))}
                        sx={{ width: 60 }}
                        inputProps={{ min: 1 }}
                      />
                    )}
                    <Typography variant="body2">{t("tasks.occurrences")}</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            {recurrence ? (
              <Button
                size="small"
                color="error"
                onClick={() => { setRecurrence(null); setRepeatAnchorEl(null); }}
              >
                {t("tasks.removeRepeat")}
              </Button>
            ) : <Box />}
            <Button size="small" variant="contained" onClick={handleSaveRepeat}>
              {t("tasks.saveRepeat")}
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}
