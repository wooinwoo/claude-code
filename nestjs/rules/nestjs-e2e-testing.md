# NestJS E2E Testing Rules

Guidelines for writing backend E2E tests. Focus on tests with business value and skip unnecessary ones.

## Test Case Naming Convention

### Success Cases: Action verbs (`does something`)

```typescript
it('returns product list', async () => { ... });
it('creates a new product', async () => { ... });
it('updates product information', async () => { ... });
it('returns only products matching filter criteria', async () => { ... });
```

### Failure Cases: `returns {status} when {condition}`

```typescript
it('returns 404 when product does not exist', async () => { ... });
it('returns 400 when required field is missing', async () => { ... });
it('returns 401 when request is unauthenticated', async () => { ... });
it('returns 403 when user lacks permission', async () => { ... });
it('returns 409 when duplicate value exists', async () => { ... });
```

### Edge Cases: Specify concrete conditions

```typescript
it('returns empty array when no data exists', async () => { ... });
it('returns empty array when page exceeds last page', async () => { ... });
it('caps at maximum value when limit is exceeded', async () => { ... });
```

---

## Required Tests (Must Write)

### 1. Happy Path

At least 1 success case per endpoint:

```typescript
describe('POST /app/lux/products', () => {
  it('creates a new product', async () => {
    const response = await getRequest()
      .post('/app/lux/products')
      .send({ name: 'Product Name', brandId: 1, price: 1000000 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'Product Name',
    });
  });
});
```

### 2. Business Rule Validation

Verify domain logic is correctly enforced:

```typescript
it('returns 400 when changing sold product to available', async () => {
  const product = await fixtures.createProduct({ status: 'SOLD' });

  const response = await getRequest()
    .patch(`/app/lux/products/${product.id}/status`)
    .send({ status: 'AVAILABLE' });

  expect(response.status).toBe(400);
  expect(response.body.code).toBe('LuxProductStatusChangeNotAllowed');
});
```

### 3. Authentication/Authorization (secured endpoints only)

```typescript
describe('Auth', () => {
  it('returns 401 when unauthenticated', async () => {
    const response = await getRequest().get('/app/users/me');
    expect(response.status).toBe(401);
  });

  it('returns 403 when accessing another user resource', async () => {
    const otherUser = await fixtures.createUser();
    const response = await getRequest()
      .get(`/app/users/${otherUser.id}/orders`)
      .set('x-user-id', String(currentUser.id));

    expect(response.status).toBe(403);
  });
});
```

### 4. Required Field Validation (1 representative case only)

Not every field — just one representative case:

```typescript
it('returns 400 when name is missing', async () => {
  const response = await getRequest()
    .post('/app/lux/products')
    .send({ brandId: 1, price: 1000000 }); // name omitted

  expect(response.status).toBe(400);
});
```

### 5. Resource Existence

```typescript
it('returns 404 when product does not exist', async () => {
  const response = await getRequest().get('/app/lux/products/999999');
  expect(response.status).toBe(404);
});
```

---

## Unnecessary Tests (Do Not Write)

### 1. Framework-Guaranteed Behavior

```typescript
// BAD: class-validator already handles this
it('returns 400 when name is not a string', ...);
it('returns 400 when price is negative', ...);
it('returns 400 when email format is invalid', ...);

// BAD: NestJS ParseIntPipe handles this
it('returns 400 when id is not a number', ...);
```

### 2. Per-Field Validation Tests

```typescript
// BAD: Individual test for each field
it('returns 400 when name is missing', ...);
it('returns 400 when brandId is missing', ...);
it('returns 400 when price is missing', ...);

// GOOD: Single representative case
it('returns 400 when required field is missing', ...);
```

### 3. Duplicate CRUD Tests

```typescript
// BAD: Testing same logic repeatedly
it('returns 1 product', ...);
it('returns 2 products', ...);
it('returns 10 products', ...);

// GOOD: Representative cases only
it('returns product list', ...);
it('returns empty array when no data exists', ...);
```

### 4. Implementation Detail Tests

```typescript
// BAD: Depends on internal implementation
it('calls Repository.save()', ...);
it('updates cache', ...);

// GOOD: Verify external behavior only
it('creates product', ...);
```

### 5. Type Verification Tests

```typescript
// BAD: TypeScript validates at compile time
it('response.id is number type', ...);
it('response.createdAt is string type', ...);
```

---

## Test Structure

### describe Block Organization

```typescript
describe('LuxProduct API', () => {
  describe('GET /app/lux/products', () => {
    describe('Success', () => {
      it('returns product list', ...);
      it('returns only products matching filter criteria', ...);
      it('applies pagination', ...);
    });

    describe('Failure', () => {
      it('returns 400 when page value is invalid', ...);
    });
  });

  describe('POST /app/lux/products', () => {
    describe('Success', () => {
      it('creates a new product', ...);
    });

    describe('Failure', () => {
      it('returns 404 when brand does not exist', ...);
      it('returns 400 when required field is missing', ...);
    });
  });
});
```

### Arrange-Act-Assert Pattern

```typescript
it('applies category filter', async () => {
  // Arrange
  const category = await fixtures.createCategory({ name: 'Bags' });
  await fixtures.createProduct({ categoryId: category.id });
  await fixtures.createProduct({ categoryId: null }); // different category

  // Act
  const response = await getRequest()
    .get('/app/lux/products')
    .query({ categoryId: category.id });

  // Assert
  expect(response.status).toBe(200);
  expect(response.body.total).toBe(1);
});
```

---

## Test Priority

### P0 (Required)
- Core business logic (payment, orders, inventory)
- Authentication/authorization
- Data integrity

### P1 (Recommended)
- CRUD success cases
- Key error cases (404, 400)
- Filter/sort/pagination

### P2 (Optional)
- Boundary value tests
- Concurrency tests
- Performance-related tests

---

## Minimum Tests Per Endpoint

| Endpoint Type | Min Tests | Composition |
|---------------|-----------|-------------|
| List (GET) | 2-3 | Success 1, empty list 1, filter 1 (if applicable) |
| Detail (GET) | 2 | Success 1, 404 1 |
| Create (POST) | 2-3 | Success 1, missing required field 1, business rule violation 1 |
| Update (PATCH/PUT) | 2-3 | Success 1, 404 1, business rule violation 1 |
| Delete (DELETE) | 2 | Success 1, 404 1 |

---

## Response Verification Scope

### Must Verify

```typescript
// Status code
expect(response.status).toBe(200);

// Key business fields
expect(response.body.id).toBe(product.id);
expect(response.body.status).toBe('AVAILABLE');

// List response structure
expect(response.body.total).toBe(1);
expect(response.body.data).toHaveLength(1);

// Error code (custom errors)
expect(response.body.code).toBe('LuxProductNotFound');
```

### Skip (Over-Verification)

```typescript
// BAD: Verifying every field
expect(response.body.name).toBe('...');
expect(response.body.brandId).toBe(1);
expect(response.body.price).toBe(1000000);
expect(response.body.createdAt).toBe('...');
expect(response.body.updatedAt).toBe('...');

// GOOD: Key fields and structure only
expect(response.body).toMatchObject({
  id: expect.any(Number),
  name: 'Product Name',
});
```

---

## Checklist

**Before writing:**
- [ ] Does this test validate business value?
- [ ] Is this already guaranteed by the framework?
- [ ] Does this duplicate another test?

**After writing:**
- [ ] Does the test name clearly indicate success/failure?
- [ ] Follows Arrange-Act-Assert pattern?
- [ ] Is the verification scope appropriate? (not excessive or insufficient)

---

## Anti-Patterns

### 1. Testing Implementation Details

```typescript
// BAD
it('calls Repository.save() once', async () => {
  const spy = jest.spyOn(repository, 'save');
  await request.post('/products').send({ ... });
  expect(spy).toHaveBeenCalledTimes(1);
});

// GOOD: Verify external behavior only
it('creates product', async () => {
  const response = await request.post('/products').send({ ... });
  expect(response.status).toBe(201);
});
```

### 2. Hardcoded IDs

```typescript
// BAD
it('returns product', async () => {
  const response = await getRequest().get('/app/lux/products/1');
  expect(response.status).toBe(200);
});

// GOOD: Use fixture-created data
it('returns product', async () => {
  const product = await fixtures.createProduct();
  const response = await getRequest().get(`/app/lux/products/${product.id}`);
  expect(response.status).toBe(200);
});
```

### 3. Test Interdependence

```typescript
// BAD: Depends on execution order
it('creates product', async () => { createdId = response.body.id; });
it('returns created product', async () => { get(`/products/${createdId}`); });

// GOOD: Each test is independent
it('returns product', async () => {
  const product = await fixtures.createProduct();
  const response = await getRequest().get(`/products/${product.id}`);
});
```
