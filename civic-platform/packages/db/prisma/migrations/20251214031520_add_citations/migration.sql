-- CreateTable
CREATE TABLE "citations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "citationNumber" TEXT NOT NULL,
    "violatorName" TEXT NOT NULL,
    "violatorEmail" TEXT,
    "violatorPhone" TEXT,
    "address" TEXT NOT NULL,
    "violationType" TEXT NOT NULL,
    "violationDate" DATETIME NOT NULL,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" REAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paidDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "citations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "citations_citationNumber_key" ON "citations"("citationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "citations_citationNumber_tenantId_key" ON "citations"("citationNumber", "tenantId");
