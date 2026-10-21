/**
 * Task List Header
 * 
 * Shows list title with options menu for list operations.
 */

import { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  MoreVert,
  Edit,
  Delete,
  VerticalAlignTop,
  DeleteSweep,
  CleaningServices,
  SwapVert,
  Check,
  DeleteOutline,
} from "@mui/icons-material";
import { useTaskLists, useTasks } from "../../hooks";
import { useTranslation } from "../../i18n";

interface TaskListHeaderProps {
  title: string;
  listId: string;
  currentSort?: string;
  onSortChange?: (sortBy: string) => void;
  dragHandleProps?: Record<string, any>;
}

export default function TaskListHeader({ 
  title, 
  listId, 
  currentSort = "my_order",
  onSortChange,
  dragHandleProps,
}: TaskListHeaderProps) {
  const { t, isRtl } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(title);

  const { taskLists, renameTaskList, deleteTaskList } = useTaskLists();
  const { clearCompletedTasks } = useTasks();

  const currentList = taskLists.find((l) => l.id === listId);
  const taskCount = currentList?.tasks?.length || 0;

  const open = Boolean(anchorEl);
  const sortOpen = Boolean(sortAnchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSortAnchorEl(null);
  };

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortSelect = (sortBy: string) => {
    onSortChange?.(sortBy);
    handleClose();
  };

  const handleRename = async () => {
    if (newTitle.trim() && newTitle !== title) {
      await renameTaskList(listId, newTitle.trim());
    }
    setRenameDialogOpen(false);
    handleClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleClose();
  };

  const handleConfirmDelete = async () => {
    await deleteTaskList(listId);
    setDeleteDialogOpen(false);
  };

  const handleClearCompleted = async () => {
    await clearCompletedTasks(listId);
    handleClose();
  };

  const sortOptions = [
    { value: "my_order", label: t("tasks.sortMyOrder") },
    { value: "date", label: t("tasks.sortDate") },
    { value: "deadline", label: t("tasks.sortDeadline") },
    { value: "starred", label: t("tasks.sortRecently") },
    { value: "title", label: t("tasks.sortTitle") },
  ];

  return (
    <>
      <Box
        {...dragHandleProps}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          cursor: dragHandleProps ? "grab" : "default",
          userSelect: "none",
          "&:active": {
            cursor: dragHandleProps ? "grabbing" : "default",
          },
        }}
      >
        <Typography
          variant="subtitle1"
          component="h2"
          dir="auto"
          sx={{
            fontWeight: 600,
            fontSize: "1rem",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            unicodeBidi: "plaintext",
            textAlign: "start",
          }}
        >
          {title}
        </Typography>

        <IconButton
          size="small"
          onClick={handleMenuClick}
          sx={{ ml: 1, opacity: 0.7, "&:hover": { opacity: 1 } }}
        >
          <MoreVert fontSize="small" />
        </IconButton>

        {/* Main Menu */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: { minWidth: 220 },
          }}
        >
          <MenuItem onClick={handleSortClick}>
            <ListItemIcon>
              <SwapVert fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("tasks.sortBy")}</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: isRtl ? 0 : 2, mr: isRtl ? 2 : 0 }}>
              {isRtl ? "◀" : "▶"}
            </Typography>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem onClick={() => { setRenameDialogOpen(true); handleClose(); }}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("tasks.renameList")}</ListItemText>
          </MenuItem>

          <MenuItem onClick={handleDelete}>
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("tasks.deleteList")}</ListItemText>
          </MenuItem>

          <MenuItem onClick={() => handleClose()}>
            <ListItemIcon>
              <VerticalAlignTop fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("tasks.moveListToFirst")}</ListItemText>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem onClick={handleClearCompleted}>
            <ListItemIcon>
              <DeleteSweep fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("tasks.deleteAllCompleted")}</ListItemText>
          </MenuItem>

          <MenuItem sx={{ color: "text.secondary" }}>
            <ListItemIcon>
              <CleaningServices fontSize="small" sx={{ color: "text.secondary" }} />
            </ListItemIcon>
            <ListItemText>{t("tasks.cleanupOld")}</ListItemText>
          </MenuItem>
        </Menu>

        {/* Sort By Submenu */}
        <Menu
          anchorEl={sortAnchorEl}
          open={sortOpen}
          onClose={() => setSortAnchorEl(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{
            sx: { minWidth: 180, ml: 0.5 },
          }}
        >
          {sortOptions.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() => handleSortSelect(option.value)}
              selected={currentSort === option.value}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {currentSort === option.value && <Check fontSize="small" />}
              </ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2.5 } }}>
        <DialogTitle>{t("tasks.renameList")}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            label={t("tasks.listName")}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            inputProps={{ dir: "auto" }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRenameDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleRename} variant="contained">{t("common.save")}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete List Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2.5 } }}>
        <DialogTitle sx={{ color: "error.main", display: "flex", alignItems: "center", gap: 1 }}>
          <DeleteOutline />
          <span>{t("tasks.deleteListTitle")}</span>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t("tasks.deleteListConfirm")}
          </Typography>
          <Typography variant="subtitle2" sx={{ mt: 1.5, fontWeight: 700 }}>
            "{title}" ({taskCount} {t("common.tasks")})
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            {t("tasks.deleteList")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
