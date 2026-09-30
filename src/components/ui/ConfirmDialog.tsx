import { Modal } from './Modal';
import { Button } from './Button';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog = ({ title, message, confirmLabel = 'Confirm', onConfirm, onClose }: Props) => (
  <Modal title={title} onClose={onClose} maxWidth="max-w-sm">
    <p className="mb-5 text-sm text-gray-600">{message}</p>
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
    </div>
  </Modal>
);
