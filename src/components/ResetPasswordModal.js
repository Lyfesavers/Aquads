import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { resetPassword } from '../services/api';

const ResetPasswordModal = ({ show, onHide, username }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await resetPassword(username, newPassword);
      setSuccess(true);
      setTimeout(() => {
        onHide();
      }, 2000);
    } catch (error) {
      setError(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Reset Password</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {success ? (
          <Alert variant="success">
            Password reset successful! You can now log in with your new password.
          </Alert>
        ) : (
          <Form onSubmit={handleSubmit}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
              className="w-100"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ResetPasswordModal; 