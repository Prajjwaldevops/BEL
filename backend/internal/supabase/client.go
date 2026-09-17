package supabase

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL     string
	serviceKey  string
	secretKey   string
	httpClient  *http.Client
}

func New(baseURL, serviceKey, secretKey string) *Client {
	return &Client{
		baseURL:    strings.TrimRight(baseURL, "/"),
		serviceKey: serviceKey,
		secretKey:  secretKey,
		httpClient: &http.Client{Timeout: 12 * time.Second},
	}
}

func (c *Client) GetTable(table string, query string) ([]byte, int, error) {
	if query == "" {
		query = "select=*&limit=50"
	}
	url := fmt.Sprintf("%s/rest/v1/%s?%s", c.baseURL, table, query)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, 0, err
	}
	c.applyAuth(req)
	req.Header.Set("Accept", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}
	return body, resp.StatusCode, nil
}

func (c *Client) applyAuth(req *http.Request) {
	key := c.serviceKey
	if key == "" {
		key = c.secretKey
	}
	req.Header.Set("apikey", key)
	req.Header.Set("Authorization", "Bearer "+key)
}

func (c *Client) Ping() (int, string, error) {
	body, status, err := c.GetTable("roles", "select=name&limit=1")
	if err != nil {
		return 0, "", err
	}
	return status, string(body), nil
}
