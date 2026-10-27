import { createUserSchema } from '../middleware/validators/userValidators';
import { validationResult } from 'express-validator';
import { Request } from 'express';

async function runValidation(schema: typeof createUserSchema, data: Record<string, unknown>) {
  const req = {
    body: data,
    query: {},
    params: {},
  } as unknown as Request;

  for (const validator of schema) {
    await validator.run(req);
  }

  return validationResult(req);
}

describe('createUserSchema password validation', () => {
  const validBasePayload = {
    full_name: 'Nguyen Van A',
    username: 'nguyenvana',
    email: 'user@example.com',
  };

  it('accepts short password (e.g. 1 character) without format/min length restriction', async () => {
    const result = await runValidation(createUserSchema, {
      ...validBasePayload,
      password: '1',
    });
    const passwordErrors = result.array().filter((e) => 'path' in e && e.path === 'password');
    expect(passwordErrors).toHaveLength(0);
  });

  it('accepts any custom string password', async () => {
    const result = await runValidation(createUserSchema, {
      ...validBasePayload,
      password: 'custom!@#$1234',
    });
    const passwordErrors = result.array().filter((e) => 'path' in e && e.path === 'password');
    expect(passwordErrors).toHaveLength(0);
  });

  it('rejects empty password', async () => {
    const result = await runValidation(createUserSchema, {
      ...validBasePayload,
      password: '',
    });
    const passwordErrors = result.array().filter((e) => 'path' in e && e.path === 'password');
    expect(passwordErrors.length).toBeGreaterThan(0);
    expect(passwordErrors[0].msg).toBe('Mật khẩu là bắt buộc');
  });
});
