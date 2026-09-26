import { randomBytes, scrypt } from "node:crypto";
import { faker } from "@faker-js/faker";
import { Gender, PrismaClient, Role } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  return new Promise<string>((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");

    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (error, key) => {
        if (error) reject(error);
        else resolve(`${salt}:${key.toString("hex")}`);
      },
    );
  });
}

async function main() {
  const password = "password123";
  const seedEmail = "seed.user@example.com";
  const seedAccountId = "seed-credential-account";
  const roles = [Role.USER, Role.ADMIN, Role.DOCTOR];

  const seedUser = await prisma.user.upsert({
    where: { email: seedEmail },
    update: {
      name: "Seed User",
      emailVerified: true,
      role: Role.USER,
    },
    create: {
      name: "Seed User",
      email: seedEmail,
      emailVerified: true,
      role: Role.USER,
    },
  });

  const seedPassword = await hashPassword(password);

  const seedAccount = {
    accountId: seedUser.id,
    providerId: "credential",
    userId: seedUser.id,
    password: seedPassword,
  };

  await prisma.account.upsert({
    where: { id: seedAccountId },
    update: seedAccount,
    create: { id: seedAccountId, ...seedAccount },
  });

  for (let i = 0; i < 10; i++) {
    const email = faker.internet.email().toLowerCase();

    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        emailVerified: true,
        role: roles[i % roles.length],
        image: faker.image.avatar(),
      },
    });

    await prisma.account.create({
      data: {
        id: faker.string.uuid(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: await hashPassword(password),
      },
    });
  }

  await prisma.patient.upsert({
    where: { email: "seed.patient@example.com" },
    update: {},
    create: {
      firstName: "Seed",
      middleName: "Patient",
      lastName: "Example",
      dateOfBirth: new Date("1990-01-01"),
      gender: Gender.OTHER,
      email: "seed.patient@example.com",
    },
  });
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
