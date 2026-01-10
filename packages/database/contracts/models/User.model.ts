import { IsString, IsDefined, IsOptional, IsDate } from "class-validator";
import { Account, Session, Authenticator } from "./";

export class User {
    @IsDefined()
    @IsString()
    id!: string;

    @IsOptional()
    @IsString()
    name?: string | null;

    @IsOptional()
    @IsString()
    email?: string | null;

    @IsOptional()
    @IsDate()
    emailVerified?: Date | null;

    @IsOptional()
    @IsString()
    image?: string | null;

    @IsDefined()
    accounts!: Account[];

    @IsDefined()
    sessions!: Session[];

    @IsDefined()
    authenticators!: Authenticator[];
}
