import { faker } from "@faker-js/faker";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const roles = [Role.USER, Role.ADMIN, Role.DOCTOR];

  for (let i = 0; i < 10; i++) {
    const email = faker.internet.email();

    await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        emailVerified: true,
        role: roles[i % roles.length],
        image: faker.image.avatar(),
        accounts: {
          create: {
            id: faker.string.uuid(),
            accountId: email,
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
      include: {
        accounts: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
