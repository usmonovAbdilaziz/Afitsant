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
    // Admin user
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

    // type ServiceData = {
    //   name: string;
    //   description: string;
    //   duration: number;
    //   price: number;
    // };

    // let services: ServiceData[] = [];

    // if (business.businessType === 'barbershop') {
    //   services = [
    //     {
    //       name: 'Haircut',
    //       description: 'Professional haircut with styling',
    //       duration: 30,
    //       price: 50000,
    //     },
    //     {
    //       name: 'Beard Trim',
    //       description: 'Beard trimming and shaping',
    //       duration: 20,
    //       price: 30000,
    //     },
    //     {
    //       name: 'Hair + Beard',
    //       description: 'Complete haircut and beard service',
    //       duration: 45,
    //       price: 70000,
    //     },
    //   ];
    // } else if (business.businessType === 'stomatology') {
    //   services = [
    //     {
    //       name: 'Consultation',
    //       description: 'Initial dental consultation and examination',
    //       duration: 30,
    //       price: 100000,
    //     },
    //     {
    //       name: 'Teeth Cleaning',
    //       description: 'Professional teeth cleaning',
    //       duration: 45,
    //       price: 200000,
    //     },
    //     {
    //       name: 'Filling',
    //       description: 'Dental filling treatment',
    //       duration: 60,
    //       price: 300000,
    //     },
    //   ];
    // }

    // if (services.length > 0) {
    //   await prisma.service.createMany({
    //     data: services.map((service) => ({
    //       ...service,
    //       businessId: business.id,
    //     })),
    //   });
    //   console.log(
    //     `✅ Created ${services.length} services for ${business.businessName}`,
    //   );
    // }
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
