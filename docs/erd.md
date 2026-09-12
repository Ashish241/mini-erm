# Mini Operations ERP - Entity Relationship Diagram

This diagram visualizes the database schema for the Mini Operations ERP system, directly reflecting the implemented Prisma schema.

```mermaid
erDiagram
    %% Core Entities
    User {
        String id PK
        String name
        String email UK
        String passwordHash
        UserRole role
        DateTime createdAt
        DateTime updatedAt
    }

    Category {
        String id PK
        String name UK
    }

    Item {
        String id PK
        String sku UK
        String name
        String categoryId FK
        DateTime createdAt
        DateTime updatedAt
    }

    Location {
        String id PK
        String code UK
        String name
    }

    Batch {
        String id PK
        String batchNumber
        String itemId FK
        DateTime createdAt
    }

    %% Inventory & Transactions
    Inventory {
        String id PK
        Int physicalQuantity
        Int reservedQuantity
        String itemId FK
        String locationId FK
        String batchId FK "Nullable"
        DateTime createdAt
        DateTime updatedAt
    }

    InventoryTransaction {
        String id PK
        InventoryTransactionType type
        Int quantity
        String referenceType "Nullable"
        String referenceId "Nullable"
        String inventoryId FK
        String createdById FK
        DateTime createdAt
    }

    %% Work Orders
    WorkOrder {
        String id PK
        String workOrderNumber UK
        WorkOrderStatus status
        Int requiredQuantity
        String itemId FK
        String locationId FK
        String assignedUserId FK "Nullable"
        DateTime createdAt
        DateTime updatedAt
    }

    WorkOrderMaterial {
        String id PK
        Int requiredQuantity
        String workOrderId FK
        String itemId FK
    }

    %% Transfers
    Transfer {
        String id PK
        String transferNumber UK
        TransferStatus status
        Int quantity
        DateTime dispatchedAt "Nullable"
        DateTime receivedAt "Nullable"
        String itemId FK
        String sourceLocationId FK
        String destinationLocationId FK
        DateTime createdAt
        DateTime updatedAt
    }

    %% Customer Orders
    CustomerOrder {
        String id PK
        String orderNumber UK
        OrderStatus status
        String createdById FK
        DateTime createdAt
        DateTime updatedAt
    }

    CustomerOrderItem {
        String id PK
        Int quantity
        Int reservedQuantity
        String orderId FK
        String itemId FK
        String locationId FK
    }

    %% Relationships
    
    %% Item & Hierarchy
    Category ||--o{ Item : "contains"
    Item ||--o{ Batch : "has"
    
    %% Inventory & Tracking
    Item ||--o{ Inventory : "stocked as"
    Location ||--o{ Inventory : "stores"
    Batch ||--o{ Inventory : "allocated to"
    Inventory ||--o{ InventoryTransaction : "logs"
    
    %% Work Orders
    Location ||--o{ WorkOrder : "manufactured at"
    Item ||--o{ WorkOrder : "produced by"
    User ||--o{ WorkOrder : "assigned to"
    WorkOrder ||--o{ WorkOrderMaterial : "requires"
    Item ||--o{ WorkOrderMaterial : "used in"
    
    %% Transfers
    Location ||--o{ Transfer : "source"
    Location ||--o{ Transfer : "destination"
    Item ||--o{ Transfer : "transferred"
    
    %% Customer Orders
    User ||--o{ CustomerOrder : "creates"
    CustomerOrder ||--o{ CustomerOrderItem : "contains"
    Item ||--o{ CustomerOrderItem : "ordered in"
    Location ||--o{ CustomerOrderItem : "fulfilled from"
    
    %% Audit / RBAC
    User ||--o{ InventoryTransaction : "audits"
```

## How to View This Diagram
- **On GitHub**: GitHub automatically renders Markdown code blocks tagged with `mermaid`. Just view this file directly in the GitHub repository.
- **Locally**: Install a Markdown preview extension that supports Mermaid in your IDE (like VSCode's "Markdown Preview Mermaid Support").
- **Online**: Copy the code block above (everything between ` ```mermaid ` and ` ``` `) and paste it into the [Mermaid Live Editor](https://mermaid.live/) to view, edit, or export the diagram as a PNG/SVG image.
