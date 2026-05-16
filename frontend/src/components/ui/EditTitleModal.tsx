import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from './index';

interface EditTitleModalProps {
  isOpen: boolean;
  currentTitle: string;
  onClose: () => void;
  onSave: (newTitle: string) => void;
}

const EditTitleModal: React.FC<EditTitleModalProps> = ({ isOpen, currentTitle, onClose, onSave }) => {
  const [title, setTitle] = useState(currentTitle);

  useEffect(() => {
    if (isOpen) setTitle(currentTitle);
  }, [isOpen, currentTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sửa tiêu đề cuộc họp" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <Input
          label="Tiêu đề"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>Hủy</Button>
          <Button variant="primary" type="submit" disabled={!title.trim()}>Lưu</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTitleModal;
