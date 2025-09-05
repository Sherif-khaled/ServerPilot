import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserRegisterForm from './UserRegisterForm';

describe('UserRegisterForm (integration)', () => {
  it('renders registration form and submits to backend', async () => {
    render(<UserRegisterForm />);
    const username = `testuser${Math.floor(Math.random()*10000)}`;
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: username } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: `${username}@example.com` } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'pass1234' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await screen.findByText(/registration successful/i);
  });

  it('shows error on duplicate registration', async () => {
    render(<UserRegisterForm />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'sherif' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'sherif@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'pass1234' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await screen.findByRole('alert');
  });
});
