import { registerAs } from '@nestjs/config';
import { IsString, IsInt, Min } from 'class-validator';
import { AiProxyConfig } from './config.type';
import validateConfig from '../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  AI_PROXY_BASE_URL: string;

  @IsString()
  AI_PROXY_API_KEY: string;

  @IsInt()
  @Min(1000)
  AI_PROXY_TIMEOUT: number;
}

export default registerAs<AiProxyConfig>('aiProxy', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    baseUrl: process.env.AI_PROXY_BASE_URL,
    apiKey: process.env.AI_PROXY_API_KEY,
    timeout: parseInt(process.env.AI_PROXY_TIMEOUT ?? '60000', 10),
  };
});
