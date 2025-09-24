import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  for (let i = 0; i < 10; i++) {
    await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        emailVerified: true,
        role: ["USER", "ADMIN", "DOCTOR"][Math.floor(Math.random() * 3)],
        image: faker.image.avatar(),
        account: {
          create: {
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
