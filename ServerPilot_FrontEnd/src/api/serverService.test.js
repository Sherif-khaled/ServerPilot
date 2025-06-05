import apiClient from './apiClient';
import MockAdapter from 'axios-mock-adapter';
import { getServers, getServerDetails, createServer, updateServer, deleteServer, testServerConnection } from './serverService';

describe('serverService', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should fetch servers for a customer', async () => {
    const customerId = 1;
    const servers = [{ id: 1, name: 'Test Server' }];
    mock.onGet(`/customers/${customerId}/servers/`).reply(200, servers);

    const result = await getServers(customerId);
    expect(result.data).toEqual(servers);
  });

  it('should fetch server details', async () => {
    const customerId = 1;
    const serverId = 1;
    const serverDetails = { id: 1, name: 'Test Server' };
    mock.onGet(`/customers/${customerId}/servers/${serverId}/`).reply(200, serverDetails);

    const result = await getServerDetails(customerId, serverId);
    expect(result.data).toEqual(serverDetails);
  });

  it('should create a new server', async () => {
    const customerId = 1;
    const serverData = { name: 'New Server' };
    mock.onPost(`/customers/${customerId}/servers/`, serverData).reply(201, serverData);

    const result = await createServer(customerId, serverData);
    expect(result.data).toEqual(serverData);
  });

  it('should update a server', async () => {
    const customerId = 1;
    const serverId = 1;
    const serverData = { name: 'Updated Server' };
    mock.onPut(`/customers/${customerId}/servers/${serverId}/`, serverData).reply(200, serverData);

    const result = await updateServer(customerId, serverId, serverData);
    expect(result.data).toEqual(serverData);
  });

  it('should delete a server', async () => {
    const customerId = 1;
    const serverId = 1;
    mock.onDelete(`/customers/${customerId}/servers/${serverId}/`).reply(204);

    const result = await deleteServer(customerId, serverId);
    expect(result.status).toBe(204);
  });

  it('should test server connection', async () => {
    const customerId = 1;
    const serverId = 1;
    const response = { status: 'connected' };
    mock.onPost(`/customers/${customerId}/servers/${serverId}/test_connection/`).reply(200, response);

    const result = await testServerConnection(customerId, serverId);
    expect(result.data).toEqual(response);
  });
});
