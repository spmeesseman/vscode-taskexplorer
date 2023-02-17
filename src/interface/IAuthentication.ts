
import { AuthenticationProviderAuthenticationSessionsChangeEvent } from "vscode";

export interface TeSessionChangeEvent extends AuthenticationProviderAuthenticationSessionsChangeEvent
{
    token?: ISessionToken;
};

export interface ISessionToken
{
	token: string;
	expiresFmt: string;
	issuedFmt: string;
	ttl: number;
}

