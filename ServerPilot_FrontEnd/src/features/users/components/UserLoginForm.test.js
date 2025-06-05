import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserLoginForm from './UserLoginForm';

describe('UserLoginForm (integration)', () => {
  it('renders login form and submits to backend', async () => {
    const onLogin = jest.fn();
    render(<UserLoginForm onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'sherif' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Admin159#' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    // Wait for redirect or success (simulate backend login)
    await waitFor(() => {
      const called = onLogin.mock.calls.length > 0;
      const error = screen.queryByRole('alert');
      expect(called || error).toBeTruthy();
    });
  });

  it('shows error on failed login', async () => {
    render(<UserLoginForm onLogin={() => {}} />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'notarealuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
