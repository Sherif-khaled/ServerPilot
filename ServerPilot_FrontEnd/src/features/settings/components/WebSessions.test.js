import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WebSessions from './WebSessions';
import * as securityService from '../../../api/securityService';

// Mock the securityService
jest.mock('../../../api/securityService');

const mockSessions = [
  {
    id: 1,
    session_key: 'session1',
    ip_address: '127.0.0.1',
    user_agent: 'Test Browser 1',
    location: 'Localhost',
    last_activity: new Date().toISOString(),
    is_current_session: true,
  },
  {
    id: 2,
    session_key: 'session2',
    ip_address: '192.168.1.1',
    user_agent: 'Test Browser 2',
    location: 'Remote Host',
    last_activity: new Date().toISOString(),
    is_current_session: false,
  },
];

describe('WebSessions Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    securityService.getUserSessions.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<WebSessions />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders sessions after successful fetch', async () => {
    securityService.getUserSessions.mockResolvedValue({ data: mockSessions });
    render(<WebSessions />);

    await waitFor(() => {
      expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      expect(screen.getByText('(Current session)')).toBeInTheDocument();
    });
  });

  test('renders error message on fetch failure', async () => {
    securityService.getUserSessions.mockRejectedValue(new Error('Failed to fetch'));
    render(<WebSessions />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load sessions. Please try again later.');
    });
  });

  test('revoke button is disabled for the current session', async () => {
    securityService.getUserSessions.mockResolvedValue({ data: mockSessions });
    render(<WebSessions />);

    await waitFor(() => {
        const currentSessionListItem = screen.getByText('127.0.0.1').closest('li');
        const otherSessionListItem = screen.getByText('192.168.1.1').closest('li');

        const revokeButtonForCurrent = currentSessionListItem.querySelector('[aria-label="revoke"]');
        const revokeButtonForOther = otherSessionListItem.querySelector('[aria-label="revoke"]');
        
        expect(revokeButtonForCurrent).toBeNull();
        expect(revokeButtonForOther).toBeInTheDocument();
    });
  });

  test('clicking revoke opens confirmation dialog', async () => {
    securityService.getUserSessions.mockResolvedValue({ data: mockSessions });
    render(<WebSessions />);

    await waitFor(() => {
        const otherSessionListItem = screen.getByText('192.168.1.1').closest('li');
        const revokeButton = otherSessionListItem.querySelector('[aria-label="revoke"]');
        fireEvent.click(revokeButton);
    });

    await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Confirm Session Revocation')).toBeInTheDocument();
    });
  });

  test('confirming revoke calls the api and refreshes the list', async () => {
    securityService.getUserSessions.mockResolvedValue({ data: mockSessions });
    securityService.revokeUserSession.mockResolvedValue({});
    render(<WebSessions />);

    // Wait for initial render
    await waitFor(() => screen.getByText('192.168.1.1'));

    // Click revoke
    const otherSessionListItem = screen.getByText('192.168.1.1').closest('li');
    const revokeButton = otherSessionListItem.querySelector('[aria-label="revoke"]');
    fireEvent.click(revokeButton);

    // Confirm in dialog
    await waitFor(() => screen.getByRole('button', { name: 'Revoke' }));
    const confirmButton = screen.getByRole('button', { name: 'Revoke' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(securityService.revokeUserSession).toHaveBeenCalledWith(2);
      expect(securityService.getUserSessions).toHaveBeenCalledTimes(2); // Initial fetch + refresh
    });
  });
});
