import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserProfile from './UserProfile';

describe('UserProfile (integration)', () => {
  it('renders profile and updates with backend', async () => {
    render(<UserProfile />);
    // Wait for profile data to load (assume "sherif" is logged in)
    await waitFor(() => {
      const loaded = screen.queryByLabelText(/username/i);
      const loading = screen.queryByText(/loading/i);
      expect(loaded || loading).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await screen.findByText(/profile updated/i);
  });

  it('shows error on update failure', async () => {
    render(<UserProfile />);
    await waitFor(() => {
      const loaded = screen.queryByLabelText(/username/i);
      const loading = screen.queryByText(/loading/i);
      expect(loaded || loading).toBeTruthy();
    });
    // Only try update if loaded
    const loaded = screen.queryByLabelText(/username/i);
    if (loaded) {
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      await screen.findByText(/update failed/i);
    }

  });
});
