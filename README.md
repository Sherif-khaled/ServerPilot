# ServerPilot

[![Backend API CI](https://github.com/Sherif-khaled/ServerPilot/actions/workflows/backend_api_ci.yml/badge.svg)](https://github.com/Sherif-khaled/ServerPilot/actions/workflows/backend_api_ci.yml)

ServerPilot is a web-based server management tool built with Django. It provides a user-friendly interface to manage and monitor your customers servers, including features for application management, system monitoring, and security.

## Features

*   **User Management:** Add, remove, and manage your users with ease.
*   **Customers Management:** Add, remove, and manage your customers with ease.
*   **Server Management:** Add, remove, and manage your servers with ease.
*   **Application Management:** Deploy and manage applications on your servers.
*   **Real-time Monitoring:** Monitor server resources like CPU, memory, and disk usage in real-time.
*   **Secure Connections:** Uses SSH for secure communication with your servers.
*   **User Authentication:** Secure user authentication and management.

## Technologies Used

*   **Backend:**
    *   Django
    *   Django REST Framework
    *   Channels (for WebSocket support)
    *   PostgreSQL
*   **Frontend:**
    *   Material-UI
    *   React
    *   Axios
*   **Testing:**
    *   Pytest
    *   Pytest-Django
    *   Coverage.py

## Installation

### Backend

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Sherif-khaled/ServerPilot.git
    cd ServerPilot
    ```

2.  **Create and activate a virtual environment:**

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install the dependencies:**

    ```bash
    pip3 install -r requirements.txt
    ```

4.  **Set up the environment variables:**

    Create a `.env` file in the root directory and add the following variables:

    ```
    # SSH credentials for integration testing
    SSH_HOST=your_server_ip
    SSH_USER=your_ssh_username
    SSH_PASS=your_ssh_password
    SSH_PORT=22

    # Database settings
    DB_NAME=serverpilot_test
    DB_USER=test_user
    DB_PASSWORD=test_password
    DB_HOST=localhost
    DB_PORT=5432
    ```

5.  **Run the database migrations:**

    ```bash
    python manage.py migrate
    ```

### Frontend

1.  **Navigate to the frontend directory:**

    ```bash
    cd ServerPilot_FrontEnd
    ```

2.  **Install the dependencies:**

    ```bash
    npm install
    ```

3.  **Build the application for production:**

    ```bash
    npm run build
    ```

    This will create a `build` directory with the static files for the frontend.

## Production Deployment

1.  **Serve the frontend:**

    The `npm run build` command creates a `build` directory with a production build of your app. You can serve this directory with a static file server. For example, using `serve`:

    ```bash
    npm install -g serve
    serve -s build
    ```

2.  **Run the backend server:**

    For production, it is recommended to use a production-ready web server like Gunicorn.

    ```bash
    gunicorn serverpilot_project.wsgi:application --bind 0.0.0.0:8000
    ```

3.  **Run the Daphne server for Channels:**

    ```bash
    daphne -p 8001 serverpilot_project.asgi:application
    ```

## Development

1.  **Start the backend development server:**

    ```bash
    python manage.py runserver
    ```

2.  **Start the frontend development server:**

    In the `ServerPilot_FrontEnd` directory, run:

    ```bash
    npm start
    ```

3.  Open your browser and navigate to `http://localhost:3000`.

## Testing

To run the tests, use the following command:

```bash
pytest
```

To view the test coverage report, run:

```bash
coverage run -m pytest
coverage report
```
