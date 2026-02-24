/**
 * HubRise API Client
 * Handles OAuth authentication and API calls to HubRise
 */

export interface HubRiseConfig {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  authUrl: string;
  redirectUri: string;
}

export interface HubRiseTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  location_id: string;
}

export interface HubRiseLocation {
  id: string;
  name: string;
  currency: string;
  country: string;
  timezone: string;
}

export interface HubRiseOrder {
  id: string;
  status: string;
  customer: {
    name: string;
    phone_number: string;
    address?: {
      street: string;
      postcode: string;
      city: string;
    };
  };
  total_price: number;
  total_tax: number;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  created_at: string;
  updated_at: string;
  service_type_ref: string; // Platform identifier: uber_eats, just_eat, deliveroo, foodhub
}

export class HubRiseClient {
  private config: HubRiseConfig;

  constructor(config?: Partial<HubRiseConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.HUBRISE_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.HUBRISE_CLIENT_SECRET || '',
      apiBaseUrl: config?.apiBaseUrl || process.env.HUBRISE_API_BASE_URL || 'https://api.hubrise.com/v1',
      authUrl: config?.authUrl || process.env.HUBRISE_AUTH_URL || 'https://manager.hubrise.com/oauth2/v1',
      redirectUri: config?.redirectUri || process.env.HUBRISE_REDIRECT_URI || '',
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'location orders customer_list catalog',
      state: state || 'hubrise_auth',
    });

    return `${this.config.authUrl}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<HubRiseTokenResponse> {
    const response = await fetch(`${this.config.authUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubRise token exchange failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * Get location information
   */
  async getLocation(locationId: string, accessToken: string): Promise<HubRiseLocation> {
    const response = await fetch(`${this.config.apiBaseUrl}/locations/${locationId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HubRise get location failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.location;
  }

  /**
   * Get orders from a location
   */
  async getOrders(locationId: string, accessToken: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
    from?: string;
    to?: string;
  }): Promise<HubRiseOrder[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);

    const response = await fetch(
      `${this.config.apiBaseUrl}/locations/${locationId}/orders?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HubRise get orders failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.orders || [];
  }

  /**
   * Get a single order by ID
   */
  async getOrder(locationId: string, orderId: string, accessToken: string): Promise<HubRiseOrder> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/locations/${locationId}/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HubRise get order failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.order;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    locationId: string,
    orderId: string,
    status: string,
    accessToken: string
  ): Promise<HubRiseOrder> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/locations/${locationId}/orders/${orderId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HubRise update order status failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.order;
  }

  /**
   * Setup webhook for order events
   */
  async setupWebhook(
    locationId: string,
    accessToken: string,
    webhookUrl: string,
    events: string[] = ['order.create', 'order.update']
  ): Promise<any> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/locations/${locationId}/webhooks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          events,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubRise webhook setup failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * List active webhooks
   */
  async listWebhooks(locationId: string, accessToken: string): Promise<any[]> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/locations/${locationId}/webhooks`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HubRise list webhooks failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.webhooks || [];
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(locationId: string, webhookId: string, accessToken: string): Promise<void> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/locations/${locationId}/webhooks/${webhookId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HubRise delete webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<HubRiseTokenResponse> {
    const response = await fetch(`${this.config.authUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubRise refresh token failed: ${error}`);
    }

    return await response.json();
  }
}

// Singleton instance
let hubRiseClientInstance: HubRiseClient | null = null;

export function getHubRiseClient(): HubRiseClient {
  if (!hubRiseClientInstance) {
    hubRiseClientInstance = new HubRiseClient();
  }
  return hubRiseClientInstance;
}
