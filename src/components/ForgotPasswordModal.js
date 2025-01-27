import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { requestPasswordReset } from '../services/api';
import ResetPasswordModal from './ResetPasswordModal';

const ForgotPasswordModal = ({ show, onHide }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await requestPasswordReset(username);
      setShowResetModal(true);
    } catch (error) {
      setError(error.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetComplete = () => {
    setShowResetModal(false);
    onHide();
  };

  return (
    <>
      <Modal show={show && !showResetModal} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Forgot Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
              className="w-100"
            >
              {isLoading ? 'Processing...' : 'Reset Password'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <ResetPasswordModal
        show={showResetModal}
        onHide={handleResetComplete}
        username={username}
      />
    </>
  );
};

export default ForgotPasswordModal; 