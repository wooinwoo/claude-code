# Backend Architecture Guide

Backend architecture guide based on NestJS + Hexagonal Architecture (Ports & Adapters).
A scalable structure from small MVPs to large-scale enterprise applications.

---

## 1. Architecture Principles

### Hexagonal Architecture (Ports & Adapters)

```
                    ┌─────────────────────────────────────┐
                    │           Primary Adapters          │
                    │  (Controllers, CLI, GraphQL, gRPC)  │
                    └──────────────────┬──────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │            Input Ports              │
                    │         (Use Case Interfaces)       │
                    └──────────────────┬──────────────────┘
                                       │
┌───────────────────────────────────────────────────────────────────────────┐
│                              DOMAIN CORE                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │    Entities     │  │  Domain Logic   │  │    Domain Events        │   │
│  │  (Pure Objects) │  │ (Business Rules)│  │ (Side Effect Triggers)  │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │           Output Ports              │
                    │      (Repository Interfaces)        │
                    └──────────────────┬──────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │         Secondary Adapters          │
                    │   (DB, Cache, External APIs, MQ)    │
                    └─────────────────────────────────────┘
```

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Dependency Inversion (DIP)** | Domain never depends on infrastructure. Always depend on interfaces |
| **Single Responsibility (SRP)** | Each class has only one reason to change |
| **Open-Closed (OCP)** | Open for extension, closed for modification. Extend by adding new Adapters |
| **Pure Domain** | Entities and Domain Services are framework-independent |

---

## 2. Layer Structure

### Layer Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer (Primary Adapters)                      │
│  - Controllers, DTOs, Interceptors, Guards                  │
├─────────────────────────────────────────────────────────────┤
│  Application Layer (Use Cases)                              │
│  - Orchestration, Transaction, Input/Output transformation  │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer (Core Business Logic)                         │
│  - Entities, Value Objects, Domain Services, Events         │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer (Secondary Adapters)                  │
│  - Repositories, External APIs, Message Queues, Cache       │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction

```
Presentation → Application → Domain ← Infrastructure
                    ↓            ↑
              (uses)      (implements)
```

**Rules:**
- Domain Layer has no dependencies on any other layer
- Application Layer depends only on Domain
- Presentation and Infrastructure depend on Application and Domain
- Infrastructure implements Domain Ports (interfaces)

---

## 3. Directory Structure by Project Scale

### Small (MVP, 1-3 domains)

Simple structure prioritizing rapid development:

```
src/
├── domain/
│   ├── entities/
│   │   └── user.entity.ts
│   ├── repositories/
│   │   └── user.repository.interface.ts
│   └── errors/
│       └── domain.error.ts
├── application/
│   └── use-cases/
│       ├── create-user.use-case.ts
│       └── get-user.use-case.ts
├── infrastructure/
│   └── persistence/
│       ├── drizzle.module.ts
│       └── repositories/
│           └── drizzle-user.repository.ts
├── presentation/
│   ├── controllers/
│   │   └── user.controller.ts
│   └── dto/
│       ├── create-user.dto.ts
│       └── user-response.dto.ts
└── app.module.ts
```

### Medium (3-10 domains)

Module separation by domain:

```
src/
├── core/                           # Shared domain core
│   ├── domain/
│   │   ├── base.entity.ts
│   │   ├── domain.error.ts
│   │   └── repository.interface.ts
│   └── application/
│       └── transactional.decorator.ts
│
├── modules/                        # Domain modules
│   ├── user/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.interface.ts
│   │   │   ├── services/
│   │   │   │   └── user-domain.service.ts
│   │   │   └── errors/
│   │   │       └── user.errors.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── create-user.use-case.ts
│   │   │       └── get-user.use-case.ts
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   │   ├── user.mapper.ts
│   │   │   │   └── drizzle-user.repository.ts
│   │   │   └── external/
│   │   │       └── cognito-auth.adapter.ts
│   │   ├── presentation/
│   │   │   ├── controllers/
│   │   │   │   └── user.controller.ts
│   │   │   └── dto/
│   │   │       ├── request/
│   │   │       └── response/
│   │   └── user.module.ts
│   │
│   ├── order/
│   │   └── ... (same structure)
│   │
│   └── product/
│       └── ... (same structure)
│
├── shared/                         # Shared infrastructure
│   ├── database/
│   ├── auth/
│   └── utils/
│
└── app.module.ts
```

### Large (10+ domains, microservice-ready)

Bounded Context-based separation:

```
src/
├── @core/                          # Framework-independent core
│   ├── domain/
│   │   ├── primitives/             # Value Objects, Base Entity
│   │   │   ├── base.entity.ts
│   │   │   ├── value-object.ts
│   │   │   └── identifier.ts
│   │   ├── events/                 # Domain Event-driven
│   │   │   ├── domain-event.ts
│   │   │   └── event-publisher.ts
│   │   └── contracts/              # Shared interfaces
│   │       └── repository.interface.ts
│   ├── application/
│   │   ├── ports/                  # Input/Output Port definitions
│   │   └── services/               # Shared Application Services
│   └── errors/
│       └── domain.error.ts
│
├── bounded-contexts/               # Separated by Bounded Context
│   │
│   ├── identity/                   # Identity & Access Context
│   │   ├── domain/
│   │   │   ├── aggregates/
│   │   │   │   └── user/
│   │   │   │       ├── user.aggregate.ts
│   │   │   │       ├── user.entity.ts
│   │   │   │       └── user-role.value-object.ts
│   │   │   ├── events/
│   │   │   │   ├── user-created.event.ts
│   │   │   │   └── user-role-changed.event.ts
│   │   │   ├── policies/
│   │   │   │   └── user-creation.policy.ts
│   │   │   └── ports/
│   │   │       ├── user.repository.ts
│   │   │       └── auth-provider.port.ts
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── create-user.command.ts
│   │   │   │   └── create-user.handler.ts
│   │   │   ├── queries/
│   │   │   │   ├── get-user.query.ts
│   │   │   │   └── get-user.handler.ts
│   │   │   └── event-handlers/
│   │   │       └── user-created.handler.ts
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   │   ├── schemas/
│   │   │   │   ├── mappers/
│   │   │   │   └── repositories/
│   │   │   └── adapters/
│   │   │       └── cognito.adapter.ts
│   │   ├── presentation/
│   │   │   ├── http/
│   │   │   │   ├── controllers/
│   │   │   │   └── dto/
│   │   │   └── grpc/               # Multi-protocol support
│   │   │       └── user.grpc.ts
│   │   └── identity.module.ts
│   │
│   ├── catalog/                    # Product Catalog Context
│   │   └── ... (same structure)
│   │
│   ├── ordering/                   # Order Management Context
│   │   └── ... (same structure)
│   │
│   └── fulfillment/                # Fulfillment Context
│       └── ... (same structure)
│
├── shared-kernel/                  # Shared across Contexts (minimize)
│   ├── value-objects/
│   │   └── money.value-object.ts
│   └── events/
│       └── integration-events.ts
│
├── infrastructure/                 # Global infrastructure
│   ├── database/
│   │   ├── drizzle.module.ts
│   │   └── migrations/
│   ├── messaging/
│   │   ├── event-bus.ts
│   │   └── sqs.adapter.ts
│   ├── cache/
│   │   └── redis.adapter.ts
│   └── observability/
│       ├── logging/
│       └── tracing/
│
└── main.ts
```

---

## 4. Core Patterns

### 4.1 Entity Pattern

Framework-independent, immutable, factory method:

```typescript
// domain/entities/user.entity.ts
import { BaseEntity } from '@core/domain/primitives/base.entity';

export interface CreateUserProps {
  email: string;
  name: string;
  role: UserRole;
}

export interface ReconstituteUserProps extends CreateUserProps {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export class User extends BaseEntity<number> {
  private _email: string;
  private _name: string;
  private _role: UserRole;
  private _createdAt: string;

  private constructor(id: number, props: Omit<ReconstituteUserProps, 'id'>) {
    super(id);
    this._email = props.email;
    this._name = props.name;
    this._role = props.role;
    this._createdAt = props.createdAt;
  }

  // Getters (read-only access)
  get email(): string { return this._email; }
  get name(): string { return this._name; }
  get role(): UserRole { return this._role; }
  get createdAt(): string { return this._createdAt; }

  // Factory: new entity (id = 0)
  static create(props: CreateUserProps): User {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    return new User(0, {
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Factory: reconstitute from DB
  static reconstitute(props: ReconstituteUserProps): User {
    return new User(props.id, props);
  }

  // Domain Logic (encapsulated business rules)
  changeRole(newRole: UserRole): void {
    if (this._role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
      throw new CannotDemoteAdminError();
    }
    this._role = newRole;
  }

  updateProfile(name: string): void {
    if (name.length < 2) {
      throw new InvalidUserNameError();
    }
    this._name = name;
  }
}
```

### 4.2 Value Object Pattern

Immutable, equality-based comparison:

```typescript
// domain/value-objects/money.value-object.ts
export class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: Currency,
  ) {
    if (_amount < 0) {
      throw new NegativeMoneyError();
    }
  }

  get amount(): number { return this._amount; }
  get currency(): Currency { return this._currency; }

  static create(amount: number, currency: Currency): Money {
    return new Money(amount, currency);
  }

  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this._amount * factor), this._currency);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount &&
           this._currency === other._currency;
  }

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new CurrencyMismatchError();
    }
  }
}
```

### 4.3 Aggregate Pattern (Large Scale)

Transactional consistency boundary:

```typescript
// domain/aggregates/order/order.aggregate.ts
export class OrderAggregate extends AggregateRoot<number> {
  private _items: OrderItem[] = [];
  private _status: OrderStatus;
  private _totalAmount: Money;

  private constructor(id: number, props: OrderProps) {
    super(id);
    this._status = props.status;
    this._items = props.items;
    this._totalAmount = this.calculateTotal();
  }

  // Modifications only within the aggregate boundary
  addItem(product: ProductSnapshot, quantity: number): void {
    if (this._status !== OrderStatus.DRAFT) {
      throw new OrderNotModifiableError();
    }

    const existingItem = this._items.find(i => i.productId === product.id);
    if (existingItem) {
      existingItem.increaseQuantity(quantity);
    } else {
      this._items.push(OrderItem.create(product, quantity));
    }

    this._totalAmount = this.calculateTotal();

    // Publish domain event
    this.addDomainEvent(new OrderItemAddedEvent(this.id, product.id, quantity));
  }

  confirm(): void {
    if (this._items.length === 0) {
      throw new EmptyOrderCannotBeConfirmedError();
    }
    if (this._status !== OrderStatus.DRAFT) {
      throw new InvalidOrderStatusTransitionError();
    }

    this._status = OrderStatus.CONFIRMED;
    this.addDomainEvent(new OrderConfirmedEvent(this.id, this._totalAmount));
  }

  private calculateTotal(): Money {
    return this._items.reduce(
      (sum, item) => sum.add(item.subtotal),
      Money.zero(Currency.KRW),
    );
  }
}
```

### 4.4 Port Pattern (Interface)

Defined by domain, implemented by infrastructure:

```typescript
// domain/ports/user.repository.ts (Output Port)
export interface IUserRepository extends IRepository<User, number> {
  findByEmail(email: string): Promise<User | null>;
  findActiveUsers(page: number, size: number): Promise<PaginatedResult<User>>;
  existsByEmail(email: string): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

// domain/ports/auth-provider.port.ts (Output Port)
export interface IAuthProvider {
  validateToken(token: string): Promise<AuthResult>;
  createSession(userId: number): Promise<SessionToken>;
  revokeSession(sessionId: string): Promise<void>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');

// domain/ports/notification.port.ts (Output Port)
export interface INotificationService {
  sendEmail(to: string, template: EmailTemplate, data: object): Promise<void>;
  sendSms(to: string, message: string): Promise<void>;
  sendPush(userId: number, notification: PushNotification): Promise<void>;
}

export const NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');
```

### 4.5 Use Case Pattern

Application Layer orchestration:

```typescript
// application/use-cases/create-order.use-case.ts
export interface CreateOrderInput {
  userId: number;
  items: Array<{ productId: number; quantity: number }>;
}

export interface CreateOrderOutput {
  orderId: number;
  totalAmount: number;
  status: string;
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  @Transactional()
  async exec(input: CreateOrderInput): Promise<CreateOrderOutput> {
    // 1. Verify user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) throw new UserNotFoundError();

    // 2. Create order
    const order = OrderAggregate.create({ userId: input.userId });

    // 3. Add items (business rules validated inside the Aggregate)
    for (const item of input.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) throw new ProductNotFoundError(item.productId);

      order.addItem(product.toSnapshot(), item.quantity);
    }

    // 4. Persist
    const saved = await this.orderRepository.save(order);

    // 5. Publish domain events
    await this.eventPublisher.publishAll(order.pullDomainEvents());

    // 6. Return output
    return {
      orderId: saved.id,
      totalAmount: saved.totalAmount.amount,
      status: saved.status,
    };
  }
}
```

### 4.6 CQRS Pattern (Large Scale)

Read/write separation:

```typescript
// application/commands/create-user.command.ts
export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly role: UserRole,
  ) {}
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: CreateUserCommand): Promise<number> {
    const user = User.create({
      email: command.email,
      name: command.name,
      role: command.role,
    });

    const saved = await this.userRepository.save(user);
    return saved.id;
  }
}

// application/queries/get-user.query.ts
export class GetUserQuery {
  constructor(public readonly userId: number) {}
}

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    @Inject(USER_READ_MODEL)
    private readonly userReadModel: IUserReadModel,
  ) {}

  async execute(query: GetUserQuery): Promise<UserDto | null> {
    // Query directly from Read Model (performance optimized)
    return this.userReadModel.findById(query.userId);
  }
}
```

### 4.7 Adapter Pattern (Infrastructure)

Port implementation:

```typescript
// infrastructure/persistence/repositories/drizzle-user.repository.ts
@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: DrizzleClsService) {}

  async findById(id: number): Promise<User | null> {
    const [row] = await this.db.tx
      .select()
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);

    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db.tx
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    return row ? UserMapper.toDomain(row) : null;
  }

  async save(entity: User): Promise<User> {
    const data = UserMapper.toPersistence(entity);

    if (entity.id === 0) {
      const [{ id }] = await this.db.tx
        .insert(userTable)
        .values(data)
        .$returningId();
      return (await this.findById(id))!;
    }

    await this.db.tx
      .update(userTable)
      .set(data)
      .where(eq(userTable.id, entity.id));
    return (await this.findById(entity.id))!;
  }

  async delete(entity: User): Promise<void> {
    await this.db.tx
      .delete(userTable)
      .where(eq(userTable.id, entity.id));
  }
}

// infrastructure/adapters/cognito.adapter.ts
@Injectable()
export class CognitoAuthAdapter implements IAuthProvider {
  constructor(private readonly cognitoClient: CognitoIdentityProviderClient) {}

  async validateToken(token: string): Promise<AuthResult> {
    // Cognito token validation logic
  }

  async createSession(userId: number): Promise<SessionToken> {
    // Session creation logic
  }
}
```

### 4.8 Mapper Pattern

Domain <-> Persistence conversion:

```typescript
// infrastructure/persistence/mappers/user.mapper.ts
type UserRow = typeof userTable.$inferSelect;
type UserInsert = typeof userTable.$inferInsert;

export class UserMapper {
  static toDomain(row: UserRow): User {
    return User.reconstitute({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as UserRole,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(entity: User): UserInsert {
    return {
      email: entity.email,
      name: entity.name,
      role: entity.role,
    };
  }

  // Join result mapping
  static toDomainWithProfile(
    row: UserRow,
    profileRow: ProfileRow | null,
  ): UserWithProfile {
    return {
      user: UserMapper.toDomain(row),
      profile: profileRow ? ProfileMapper.toDomain(profileRow) : null,
    };
  }
}
```

### 4.9 Domain Event Pattern (Large Scale)

Event-driven communication for loose coupling:

```typescript
// domain/events/order-confirmed.event.ts
export class OrderConfirmedEvent extends DomainEvent {
  constructor(
    public readonly orderId: number,
    public readonly totalAmount: Money,
    public readonly occurredAt: Date = new Date(),
  ) {
    super();
  }
}

// application/event-handlers/order-confirmed.handler.ts
@EventHandler(OrderConfirmedEvent)
export class OrderConfirmedHandler implements IDomainEventHandler<OrderConfirmedEvent> {
  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: INotificationService,
    @Inject(INVENTORY_SERVICE)
    private readonly inventoryService: IInventoryService,
  ) {}

  async handle(event: OrderConfirmedEvent): Promise<void> {
    // Decrease inventory
    await this.inventoryService.decreaseStock(event.orderId);

    // Send notification
    await this.notificationService.sendEmail(
      event.userEmail,
      EmailTemplate.ORDER_CONFIRMED,
      { orderId: event.orderId },
    );
  }
}
```

### 4.10 Domain Error Pattern

Structured error hierarchy:

```typescript
// core/errors/domain.error.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;        // PascalCase error code
  abstract readonly statusCode: number;  // HTTP status code

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// domain/errors/user.errors.ts
export class UserNotFoundError extends DomainError {
  readonly code = 'UserNotFound';
  readonly statusCode = 404;

  constructor(userId?: number) {
    super('User not found', { userId });
  }
}

export class EmailAlreadyExistsError extends DomainError {
  readonly code = 'EmailAlreadyExists';
  readonly statusCode = 409;

  constructor(email: string) {
    super('Email is already in use', { email });
  }
}

export class InvalidUserStateError extends DomainError {
  readonly code = 'InvalidUserState';
  readonly statusCode = 400;

  constructor(currentState: string, attemptedAction: string) {
    super(`Cannot perform ${attemptedAction} in current state (${currentState})`);
  }
}
```

---

## 5. Module Registration Patterns

### Symbol Token-Based DI

```typescript
// user.module.ts
@Module({
  imports: [DrizzleClsModule],
  controllers: [UserController],
  providers: [
    // Use Cases
    CreateUserUseCase,
    GetUserUseCase,
    UpdateUserUseCase,

    // Repository binding (Port -> Adapter)
    {
      provide: USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },

    // External Service binding
    {
      provide: AUTH_PROVIDER,
      useClass: CognitoAuthAdapter,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
```

### Feature Module Pattern (Medium~Large)

```typescript
// modules/order/order.module.ts
@Module({
  imports: [
    DrizzleClsModule,
    UserModule,      // Import dependent module
    ProductModule,
  ],
  controllers: [OrderController],
  providers: [
    // Commands
    CreateOrderUseCase,
    ConfirmOrderUseCase,
    CancelOrderUseCase,

    // Queries
    GetOrderUseCase,
    ListOrdersUseCase,

    // Event Handlers
    OrderConfirmedHandler,

    // Repositories
    {
      provide: ORDER_REPOSITORY,
      useClass: DrizzleOrderRepository,
    },
  ],
  exports: [ORDER_REPOSITORY],
})
export class OrderModule {}
```

---

## 6. Scaling Strategy by Size

### Small -> Medium Transition

**Triggers:**
- More than 3 domains
- 3 or more team members
- Complex business rules emerging

**Transition tasks:**
1. Separate directories by domain
2. Extract shared Core module
3. Introduce Repository Interfaces
4. Split Use Cases into single responsibility

### Medium -> Large Transition

**Triggers:**
- More than 10 domains
- Team separation needed
- MSA migration planned
- Complex inter-domain communication

**Transition tasks:**
1. Identify and separate Bounded Contexts
2. Introduce Aggregate pattern
3. Domain Event-based communication
4. Apply CQRS (when needed)
5. Separate Read Models
6. Define Integration Events

### Scaling Checklist

| Pattern | Small | Medium | Large |
|---------|-------|--------|-------|
| Entity Pattern | O | O | O |
| Factory Method | O | O | O |
| Repository Interface | △ | O | O |
| Use Case Pattern | O | O | O |
| Domain Service | △ | O | O |
| Value Objects | △ | O | O |
| Aggregates | X | △ | O |
| Domain Events | X | △ | O |
| CQRS | X | X | △ |
| Event Sourcing | X | X | △ |
| Bounded Contexts | X | X | O |

---

## 7. Anti-Patterns and Solutions

### 7.1 Anemic Domain Model

```typescript
// WRONG: Empty shell Entity
export class User {
  id: number;
  email: string;
  status: string;
}

@Injectable()
export class UserService {
  // All logic lives in the Service
  async activate(user: User): Promise<void> {
    if (user.status === 'suspended') {
      throw new Error('Cannot activate');
    }
    user.status = 'active';
    await this.repo.save(user);
  }
}

// CORRECT: Rich Domain Model
export class User extends BaseEntity<number> {
  private _status: UserStatus;

  activate(): void {
    if (this._status === UserStatus.SUSPENDED) {
      throw new CannotActivateSuspendedUserError();
    }
    this._status = UserStatus.ACTIVE;
  }
}
```

### 7.2 God Use Case

```typescript
// WRONG: Use Case with multiple responsibilities
export class UserUseCase {
  async create() { ... }
  async update() { ... }
  async delete() { ... }
  async sendEmail() { ... }
  async generateReport() { ... }
}

// CORRECT: Single responsibility Use Case
export class CreateUserUseCase { async exec() { ... } }
export class UpdateUserUseCase { async exec() { ... } }
export class DeleteUserUseCase { async exec() { ... } }
```

### 7.3 Leaky Abstraction

```typescript
// WRONG: Domain directly references infrastructure
export class User {
  async save(): Promise<void> {
    await drizzle.insert(userTable).values(this);  // Infrastructure dependency!
  }
}

// CORRECT: Abstraction through Ports
// Domain: Define only the interface
export interface IUserRepository {
  save(user: User): Promise<User>;
}

// Infrastructure: Implementation
export class DrizzleUserRepository implements IUserRepository {
  async save(user: User): Promise<User> {
    // Use Drizzle
  }
}
```

### 7.4 Circular Dependencies

```typescript
// WRONG: Circular dependency
// order.module.ts
@Module({ imports: [UserModule] })  // Order -> User
export class OrderModule {}

// user.module.ts
@Module({ imports: [OrderModule] })  // User -> Order (circular!)
export class UserModule {}

// CORRECT: Event-based communication
// user.module.ts
@Module({})
export class UserModule {}

// order.module.ts
@Module({})
export class OrderModule {
  // Subscribes to and handles UserCreatedEvent
}
```

---

## 8. Testing Strategy

### Test Scope by Layer

| Layer | Test Type | Tools | Purpose |
|-------|-----------|-------|---------|
| Domain | Unit | Jest | Verify business logic |
| Application | Unit + Integration | Jest + Mock | Use Case orchestration |
| Infrastructure | Integration | Jest + TestContainer | DB/external service integration |
| Presentation | E2E | Supertest | API contract verification |

### Domain Tests

```typescript
describe('User Entity', () => {
  describe('activate', () => {
    it('activates a user in normal state', () => {
      const user = User.create({ email: 'test@test.com', name: 'Test' });

      user.activate();

      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('cannot activate a suspended user', () => {
      const user = User.reconstitute({
        id: 1,
        email: 'test@test.com',
        status: UserStatus.SUSPENDED,
      });

      expect(() => user.activate()).toThrow(CannotActivateSuspendedUserError);
    });
  });
});
```

### Use Case Tests

```typescript
describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockOrderRepo = { save: jest.fn(), findById: jest.fn() } as any;
    mockProductRepo = { findById: jest.fn() } as any;
    useCase = new CreateOrderUseCase(mockOrderRepo, mockProductRepo);
  });

  it('creates an order with valid products', async () => {
    mockProductRepo.findById.mockResolvedValue(mockProduct);
    mockOrderRepo.save.mockResolvedValue(mockOrder);

    const result = await useCase.exec({ userId: 1, items: [{ productId: 1, quantity: 2 }] });

    expect(result.orderId).toBe(1);
    expect(mockOrderRepo.save).toHaveBeenCalled();
  });
});
```

---

## 9. Decision Flowchart

```
New feature requirement arrives
         │
         ▼
┌─────────────────┐
│ Are business    │
│ rules complex?  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
   Yes        No
    │         │
    ▼         ▼
┌──────┐  ┌──────────┐
│Entity│  │DTO/Simple│
│domain│  │CRUD is OK│
│logic │  └──────────┘
└──┬───┘
   │
   ▼
┌─────────────────┐
│ Are multiple    │
│ Entities changed│
│ together?       │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
   Yes        No
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│Aggregate│ │Single  │
│pattern  │  │Entity  │
└────────┘  └────────┘
```

---

## 10. Checklist

### Before Writing Code

- [ ] Identified which layer the implementation belongs to?
- [ ] Consistent with existing patterns?
- [ ] Dependency direction is correct? (inward only)

### When Writing Entities

- [ ] Private constructor + factory methods (create, reconstitute)
- [ ] Private properties + only getters exposed
- [ ] Business rules encapsulated inside the Entity?
- [ ] No framework dependencies?

### When Writing Use Cases

- [ ] Single responsibility? (one Use Case = one feature)
- [ ] Input/Output types clearly defined?
- [ ] Transaction scope is appropriate?
- [ ] Domain logic hasn't leaked into the Use Case?

### When Writing Repositories

- [ ] Interface is in the Domain layer?
- [ ] Implementation is in the Infrastructure layer?
- [ ] DI configured with Symbol token?
- [ ] Domain <-> Persistence conversion through Mapper?

### When Writing Tests

- [ ] Domain tests: verify business rules
- [ ] Use Case tests: verify orchestration
- [ ] E2E tests: verify API contracts
- [ ] 80%+ coverage achieved

---

## 11. References

- [Hexagonal Architecture by Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design by Eric Evans](https://domainlanguage.com/ddd/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Implementing Domain-Driven Design by Vaughn Vernon](https://www.informit.com/store/implementing-domain-driven-design-9780321834577)
