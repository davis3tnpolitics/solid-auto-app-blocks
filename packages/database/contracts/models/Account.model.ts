import { IsString, IsDefined, IsOptional, IsInt } from "class-validator";
import { User } from "./";

export class Account {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    userId!: string;

    @IsDefined()
    user!: User;

    @IsDefined()
    @IsString()
    type!: string;

    @IsDefined()
    @IsString()
    provider!: string;

    @IsDefined()
    @IsString()
    providerAccountId!: string;

    @IsOptional()
    @IsString()
    refresh_token?: string | null;

    @IsOptional()
    @IsString()
    access_token?: string | null;

    @IsOptional()
    @IsInt()
    expires_at?: number | null;

    @IsOptional()
    @IsString()
    token_type?: string | null;

    @IsOptional()
    @IsString()
    scope?: string | null;

    @IsOptional()
    @IsString()
    id_token?: string | null;

    @IsOptional()
    @IsString()
    session_state?: string | null;
}
