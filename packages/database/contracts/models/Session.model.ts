import { IsString, IsDefined, IsDate } from "class-validator";
import { User } from "./";

export class Session {
    @IsDefined()
    @IsString()
    id!: string;

    @IsDefined()
    @IsString()
    sessionToken!: string;

    @IsDefined()
    @IsString()
    userId!: string;

    @IsDefined()
    user!: User;

    @IsDefined()
    @IsDate()
    expires!: Date;
}
