// Responsible to search if the user is already regi

import { getDbConnection } from "@database/db";
import { Users } from "@database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import createTokens from "@/helpers/createTokens";

export type User = {
  name: string;
  email: string;
  id?: number;
  token?: string;
  refreshToken?: string;
};

export type UserReply = {
  user?: User;
  error?: string;
  status: number;
};

export type ErrorType = {
  error: string;
};

type NewData = {
  name?: string;
  password?: string;
  updatedAt: Date;
};

const hashPassword = async (
  password: string,
): Promise<string | { error: string }> => {
  const saltRounds = 8;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    return { error: (error as { message: string }).message };
  }
};

const createOrUpdateUserService = async (
  name: string,
  email: string,
  password: string,
  editUser?: boolean,
): Promise<UserReply> => {
  const db = await getDbConnection();
  let hashedPassword: string | { error: string } = "";

  const user = (
    await db
      .select({
        id: Users.id,
        name: Users.name,
        email: Users.email,
      })
      .from(Users)
      .where(eq(Users.email, email))
  )[0] as User;

  if (editUser) {
    if (!user) {
      return { error: "User not found", status: 404 };
    }

    const setNewData: NewData = {
      updatedAt: new Date(),
    };

    if (name) {
      setNewData.name = name;
    }

    if (password) {
      hashedPassword = await hashPassword(password);
      if (typeof hashedPassword === "object") {
        return { error: hashedPassword.error, status: 400 };
      }

      setNewData.password = hashedPassword;
    }

    const result: { info?: string } = (
      await db.update(Users).set(setNewData).where(eq(Users.email, email))
    )[0];

    if (result?.info) {
      if (result.info.includes("Changed: 1")) {
        const tokens = createTokens({
          id: user.id,
          name: name || user.name,
          email,
        });

        return {
          user: {
            id: user.id,
            name: name || user.name,
            email,
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
          status: 200,
        };
      }
      return { error: result.info, status: 400 };
    }
    return { error: result as string, status: 400 };
  }

  if (user) {
    return { error: "User already exists", status: 400 };
  }

  const date = new Date();
  hashedPassword = await hashPassword(password);
  if (typeof hashedPassword === "object") {
    return { error: hashedPassword.error, status: 500 };
  }

  const newUser = (
    await db
      .insert(Users)
      .values({
        name,
        email,
        password: hashedPassword,
        createdAt: date,
        updatedAt: date,
      })
      .$returningId()
  )[0];

  if (!newUser) {
    return { error: `User not created: ${newUser}`, status: 500 };
  }
  const tokens = createTokens({ id: newUser.id, name, email });
  return {
    user: {
      id: newUser.id,
      name,
      email,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
    status: 201,
  };
};

export default createOrUpdateUserService;
