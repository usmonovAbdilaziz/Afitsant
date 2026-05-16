import { prisma } from '../lib/prisma';
import { PasswordUtil } from '../src/utils/password';
import { UserType, Gender } from '../generated/prisma/index';

interface SeedUser {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  userType: UserType;
  business?: {
    businessName: string;
    businessType: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    phone: string;
    description?: string;
  };
}

async function main() {
  console.log('🌱 Starting database seed...');

  const seedUsers: SeedUser[] = [
    {
      email: process.env.SEED_BUSINESS_EMAIL || 'business@test.com',
      password: process.env.SEED_BUSINESS_PASSWORD || 'Business123',
      fullName: 'Test Business Owner',
      phoneNumber: '+998901234568',
      userType: UserType.BUSINESS,
      business: {
        businessName: 'Premium Barbershop',
        businessType: 'barbershop',
        address: '123 Main Street',
        city: 'Tashkent',
        latitude: 41.2995,
        longitude: 69.2401,
        phone: '+998901234568',
        description: 'Professional barbershop with experienced barbers',
      },
    },
    {
      email: process.env.SEED_STOMATOLOGY_EMAIL || 'clinic@test.com',
      password: process.env.SEED_STOMATOLOGY_PASSWORD || 'Clinic123',
      fullName: 'Dr. Dental Clinic',
      phoneNumber: '+998901234569',
      userType: UserType.BUSINESS,
      business: {
        businessName: 'Smile Dental Clinic',
        businessType: 'stomatology',
        address: '456 Health Avenue',
        city: 'Tashkent',
        latitude: 41.3111,
        longitude: 69.2797,
        phone: '+998901234569',
        description: 'Modern dental clinic with latest equipment',
      },
    },
    {
      email: process.env.SEED_ADMIN_EMAIL || 'admin@test.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin123',
      fullName: 'System Administrator',
      phoneNumber: '+998900000000',
      userType: UserType.ADMIN,
    },
  ];

  for (const userData of seedUsers) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      const hashedPassword = await PasswordUtil.hash(userData.password);

      if (userData.business) {
        await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            fullName: userData.fullName,
            phoneNumber: userData.phoneNumber,
            userType: userData.userType,
            isVerified: true,
            business: {
              create: {
                businessName: userData.business.businessName,
                businessType: userData.business.businessType,
                address: userData.business.address,
                city: userData.business.city,
                latitude: userData.business.latitude,
                longitude: userData.business.longitude,
                phone: userData.business.phone,
                description: userData.business.description,
                isApproved: true,
              },
            },
          },
        });
        console.log(`✅ Created business user: ${userData.email}`);
      } else {
        await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            fullName: userData.fullName,
            phoneNumber: userData.phoneNumber,
            userType: userData.userType,
            isVerified: true,
          },
        });
        console.log(
          `✅ Created ${userData.userType.toLowerCase()} user: ${userData.email}`,
        );
      }
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error);
    }
  }

  const businesses = await prisma.business.findMany();

  for (const business of businesses) {
    const existingServices = await prisma.service.findMany({
      where: { businessId: business.id },
    });

    if (existingServices.length > 0) {
      console.log(
        `⏭️  Services for ${business.businessName} already exist, skipping...`,
      );
      continue;
    }

    // Generate seed services: 5 per Category (FOODS, DRINKS, SWEETS, SALADS)
    const categories = ['FOODS', 'DRINKS', 'SWEETS', 'SALADS'] as const;

    const generatedServices: any[] = [];

    for (const category of categories) {
      for (let i = 1; i <= 5; i++) {
        const baseName = `${category.toString().toLowerCase()}-service-${i}`;
        const name = `${business.businessName} ${baseName}`;
        const description = `Sample ${category} service ${i} for ${business.businessName}`;
        // vary duration and price slightly per index
        const duration = 15 + i * 5;
        const price = 10000 + i * 5000;
        const isDrink = category === 'DRINKS';

        const serviceData: any = {
          businessId: business.id,
          name,
          category,
          type: i % 2 === 0 ? 'COLD' : 'HOT',
          description,
          duration,
          price,
          isActive: true,
          liters: isDrink ? ['0.5', '1'] : [],
          photoUrl: null,
        };

        generatedServices.push(serviceData);
      }
    }

    if (generatedServices.length > 0) {
      // prisma.createMany does not support enums as plain strings in some setups, but here it should work.
      try {
        await prisma.service.createMany({ data: generatedServices });
        console.log(
          `✅ Created ${generatedServices.length} services for ${business.businessName}`,
        );
      } catch (e) {
        // fallback: create one-by-one if createMany fails
        console.warn('createMany failed, falling back to create loop', e);
        for (const s of generatedServices) {
          await prisma.service.create({ data: s });
        }
        console.log(
          `✅ Created ${generatedServices.length} services (fallback) for ${business.businessName}`,
        );
      }
    }
  }

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
