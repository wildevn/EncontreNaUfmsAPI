// Responsible to search if the user is already regi

import { getDbConnection } from "@database/db";
import { Users } from "@database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import type { User } from "../userServices/createOrUpdateUserService";
import createTokens, { type Tokens } from "@/helpers/createTokens";

interface UserWithPassword extends User {
  password: string;
}

const logInService = async (email: string, password: string) => {
  const db = await getDbConnection();

  const user = (
    await db
      .select({
        id: Users.id,
        name: Users.name,
        email: Users.email,
        password: Users.password,
      })
      .from(Users)
      .where(eq(Users.email, email))
  )[0] as UserWithPassword;

  if (!user) {
    return { error: "User not found", status: 404 };
  }
  try {
    const validPassword = await bcrypt.compare(password, user.password);

    if (validPassword) {
      const tokens: Tokens = createTokens({
        id: user.id,
        name: user.name,
        email: user.email,
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        status: 200,
      };
    }
    return { error: "Invalid password", status: 401 };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message, status: 500 };
    }
    return { error: "Unexpected error", status: 401 };
  }
};

export default logInService;
