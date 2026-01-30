import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default-tenant' },
    update: {},
    create: {
      name: 'Default Tenant',
      slug: 'default-tenant',
    },
  });

  console.log('✅ Tenant created:', tenant.name);

  // Create default roles
  const roles = ['Admin', 'Clerk', 'Officer', 'Inspector', 'ReadOnly'];
  const createdRoles = [];

  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: {
        name_tenantId: {
          name: roleName,
          tenantId: tenant.id,
        },
      },
      update: {},
      create: {
        name: roleName,
        tenantId: tenant.id,
      },
    });
    createdRoles.push(role);
  }

  console.log('✅ Roles created:', createdRoles.map((r) => r.name).join(', '));

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: {
      email_tenantId: {
        email: 'admin@example.com',
        tenantId: tenant.id,
      },
    },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      tenantId: tenant.id,
      userRoles: {
        create: {
          roleId: createdRoles.find((r) => r.name === 'Admin')!.id,
        },
      },
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  console.log('✅ Admin user created:', admin.email);
  console.log('   Password: admin123');
  console.log('   Roles:', admin.userRoles.map((ur) => ur.role.name).join(', '));

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
