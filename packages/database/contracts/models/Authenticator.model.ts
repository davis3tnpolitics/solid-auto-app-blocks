import { IsString, IsDefined, IsInt, IsBoolean, IsOptional } from "class-validator";
import { User } from "./";

export class Authenticator {
    @IsDefined()
    @IsString()
    userId!: string;

    @IsDefined()
    user!: User;

    @IsDefined()
    @IsString()
    credentialID!: string;

    @IsDefined()
    @IsString()
    providerAccountId!: string;

    @IsDefined()
    @IsString()
    credentialPublicKey!: string;

    @IsDefined()
    @IsInt()
    counter!: number;

    @IsDefined()
    @IsString()
    credentialDeviceType!: string;

    @IsDefined()
    @IsBoolean()
    credentialBackedUp!: boolean;

    @IsOptional()
    @IsString()
    transports?: string | null;
}
