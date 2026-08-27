import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('POST /shorten', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(3000);
  });

  it('should return 201 with a 6-character alphanumeric code and shortUrl', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    expect(res.body).toHaveProperty('code');
    expect(typeof res.body.code).toBe('string');
    expect(res.body.code).toHaveLength(6);
    expect(res.body.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(res.body).toHaveProperty('shortUrl');
    expect(res.body.shortUrl).toBe(`http://localhost:3000/${res.body.code}`);
  });

  it('should return hits: 0 via stats after creation', async () => {
    const shortenRes = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    const statsRes = await request(app)
      .get(`/${shortenRes.body.code}/stats`)
      .expect(200);

    expect(statsRes.body.hits).toBe(0);
  });

  it('should generate different codes for the same URL', async () => {
    const res1 = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    const res2 = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    expect(res1.body.code).not.toBe(res2.body.code);
  });

  it('should return 400 when url is missing', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error).toBe('string');
  });

  it('should return 400 when url is empty string', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: '' })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 when url is not a string', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 12345 })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 for protocol not allowed (ftp://)', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'ftp://example.com' })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 for protocol not allowed (javascript:)', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'javascript:alert(1)' })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 for malformed URL', async () => {
    const res = await request(app)
      .post('/shorten')
      .send({ url: 'not-a-url' })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should not create a link when validation fails', async () => {
    await request(app)
      .post('/shorten')
      .send({ url: 'ftp://example.com' })
      .expect(400);

    await request(app)
      .get('/stats')
      .expect(404);
  });
});

describe('GET /:code', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(3000);
  });

  it('should redirect 302 to the original URL', async () => {
    const shortenRes = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    const code = shortenRes.body.code;

    const res = await request(app)
      .get(`/${code}`)
      .expect(302);

    expect(res.headers['location']).toBe('https://example.com');
  });

  it('should return 404 for non-existent code', async () => {
    const res = await request(app)
      .get('/nonexistent')
      .expect(404);

    expect(res.body).toHaveProperty('error');
  });

  it('should not create stats for non-existent code', async () => {
    await request(app)
      .get('/nonexistent')
      .expect(404);

    const res = await request(app)
      .get('/nonexistent/stats')
      .expect(404);

    expect(res.body).toHaveProperty('error');
  });

  it('should increment hits on each redirect', async () => {
    const shortenRes = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    const code = shortenRes.body.code;

    await request(app).get(`/${code}`).expect(302);
    await request(app).get(`/${code}`).expect(302);

    const statsRes = await request(app)
      .get(`/${code}/stats`)
      .expect(200);

    expect(statsRes.body.hits).toBe(2);
  });
});

describe('GET /:code/stats', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(3000);
  });

  it('should return 200 with code, url, and hits', async () => {
    const shortenRes = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    const code = shortenRes.body.code;

    const res = await request(app)
      .get(`/${code}/stats`)
      .expect(200);

    expect(res.body).toEqual({
      code,
      url: 'https://example.com',
      hits: 0,
    });
  });

  it('should not increment hits when fetching stats', async () => {
    const shortenRes = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    const code = shortenRes.body.code;

    await request(app).get(`/${code}/stats`).expect(200);
    await request(app).get(`/${code}/stats`).expect(200);

    const res = await request(app)
      .get(`/${code}/stats`)
      .expect(200);

    expect(res.body.hits).toBe(0);
  });

  it('should not increment hits on creation', async () => {
    const shortenRes = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    const code = shortenRes.body.code;

    const res = await request(app)
      .get(`/${code}/stats`)
      .expect(200);

    expect(res.body.hits).toBe(0);
  });

  it('should return 404 for non-existent code', async () => {
    const res = await request(app)
      .get('/nonexistent/stats')
      .expect(404);

    expect(res.body).toHaveProperty('error');
  });

  it('should not treat /stats as a redirect code', async () => {
    const res = await request(app)
      .get('/stats')
      .expect(404);

    expect(res.body).toHaveProperty('error');
  });
});

describe('Port configuration', () => {
  it('should use the configured port in shortUrl', async () => {
    const app = createApp(4321);

    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    expect(res.body.shortUrl).toBe(`http://localhost:4321/${res.body.code}`);
  });

  it('should respect PORT environment variable', async () => {
    const originalPort = process.env['PORT'];
    process.env['PORT'] = '5050';

    const port = Number(process.env['PORT']) || 3000;
    const app = createApp(port);

    const res = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);

    expect(res.body.shortUrl).toBe('http://localhost:5050/' + res.body.code);

    if (originalPort !== undefined) {
      process.env['PORT'] = originalPort;
    } else {
      delete process.env['PORT'];
    }
  });
});