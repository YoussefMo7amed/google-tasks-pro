/**
 * Add Category Dialog
 * 
 * Dialog for creating a new task list.
 */

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from "@mui/material";
import { useTaskLists } from "../../hooks";
import { useTranslation } from "../../i18n";

interface AddCategoryDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AddCategoryDialog({
  open,
  onClose,
}: AddCategoryDialogProps) {
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const { createTaskList } = useTaskLists();

  const handleAdd = async () => {
    if (!categoryName.trim()) return;

    setLoading(true);
    try {
      await createTaskList(categoryName.trim());
      setCategoryName("");
      onClose();
    } catch (error) {
      console.error("Error adding list:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCategoryName("");
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !loading && categoryName.trim()) {
      handleAdd();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle>{t("tasks.createListTitle")}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label={t("tasks.listName")}
            fullWidth
            variant="outlined"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            inputProps={{ dir: "auto" }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={!categoryName.trim() || loading}
        >
          {t("common.create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
