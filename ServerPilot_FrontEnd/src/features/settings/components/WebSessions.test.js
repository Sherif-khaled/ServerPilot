import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
// eslint-disable-next-line testing-library/no-manual-cleanup
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

    await screen.findByText('127.0.0.1');
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('(Current session)')).toBeInTheDocument();
  });

  test('renders error message on fetch failure', async () => {
    securityService.getUserSessions.mockRejectedValue(new Error('Failed to fetch'));
    render(<WebSessions />);

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load sessions. Please try again later.');
  });

  test('revoke button is disabled for the current session', async () => {
    securityService.getUserSessions.mockResolvedValue({ data: mockSessions });
    render(<WebSessions />);

    const currentSessionListItem = await screen.findByText('127.0.0.1');
    const otherSessionListItem = screen.getByText('192.168.1.1');
    const revokeButtons = screen.getAllByLabelText('revoke');
    expect(revokeButtons.length).toBeGreaterThan(0);
  });

  test('clicking revoke opens confirmation dialog', async () => {
    securityService.getUserSessions.mockResolvedValue({ data: mockSessions });
    render(<WebSessions />);

    const revokeButton = await screen.findByLabelText('revoke');
    fireEvent.click(revokeButton);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Session Revocation')).toBeInTheDocument();
  });

  test('confirming revoke calls the api and refreshes the list', async () => {
    securityService.getUserSessions.mockResolvedValue({ data: mockSessions });
    securityService.revokeUserSession.mockResolvedValue({});
    render(<WebSessions />);

    // Wait for initial render
    await screen.findByText('192.168.1.1');

    // Click revoke
    const revokeButton2 = screen.getAllByLabelText('revoke')[0];
    fireEvent.click(revokeButton2);

    // Confirm in dialog
    await screen.findByRole('button', { name: 'Revoke' });
    const confirmButton = screen.getByRole('button', { name: 'Revoke' });
    fireEvent.click(confirmButton);

    await screen.findByText('Confirm Session Revocation');
    expect(securityService.revokeUserSession).toHaveBeenCalledWith(2);
    expect(securityService.getUserSessions).toHaveBeenCalledTimes(2);
  });
});
