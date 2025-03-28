import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Controlador para endpoints de health check
 */
export class HealthController {
  /**
   * GET /api/health
   * Verifica a saúde do sistema, incluindo conexões com MongoDB e Redis
   */
  public checkHealth = async (req: Request, res: Response) => {
    try {
      const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        services: {
          mongodb: {
            status: 'unknown',
            details: ''
          },
          redis: {
            status: 'unknown',
            details: ''
          }
        }
      };

      // Verifica a conexão com o MongoDB
      try {
        const mongoStatus = mongoose.connection.readyState;
        switch (mongoStatus) {
          case 0:
            healthStatus.services.mongodb = { status: 'disconnected', details: 'Disconnected' };
            break;
          case 1:
            healthStatus.services.mongodb = { status: 'ok', details: 'Connected' };
            break;
          case 2:
            healthStatus.services.mongodb = { status: 'connecting', details: 'Connecting' };
            break;
          case 3:
            healthStatus.services.mongodb = { status: 'disconnecting', details: 'Disconnecting' };
            break;
          default:
            healthStatus.services.mongodb = { status: 'unknown', details: `Unknown state: ${mongoStatus}` };
        }
      } catch (mongoError) {
        logger.error('Erro ao verificar status do MongoDB', {
          error: mongoError instanceof Error ? mongoError.message : 'Erro desconhecido'
        });
        healthStatus.services.mongodb = { 
          status: 'error', 
          details: mongoError instanceof Error ? mongoError.message : 'Erro desconhecido'
        };
      }

      // Verifica a conexão com o Redis
      try {
        const redis = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          connectTimeout: 5000
        });

        const pingResult = await redis.ping();
        if (pingResult === 'PONG') {
          healthStatus.services.redis = { status: 'ok', details: 'Connected' };
        } else {
          healthStatus.services.redis = { status: 'error', details: `Unexpected response: ${pingResult}` };
        }

        // Fecha a conexão para não deixar conexões abertas
        await redis.quit();
      } catch (redisError) {
        logger.error('Erro ao verificar status do Redis', {
          error: redisError instanceof Error ? redisError.message : 'Erro desconhecido'
        });
        healthStatus.services.redis = { 
          status: 'error', 
          details: redisError instanceof Error ? redisError.message : 'Erro desconhecido'
        };
      }

      // Determina o status geral com base nos serviços
      if (healthStatus.services.mongodb.status === 'ok' && healthStatus.services.redis.status === 'ok') {
        healthStatus.status = 'ok';
      } else if (healthStatus.services.mongodb.status === 'error' && healthStatus.services.redis.status === 'error') {
        healthStatus.status = 'critical';
      } else {
        healthStatus.status = 'degraded';
      }

      // Retorna o status com o código HTTP apropriado
      const httpStatus = healthStatus.status === 'ok' ? 200 : 
                         healthStatus.status === 'degraded' ? 200 : 500;
      
      return res.status(httpStatus).json(healthStatus);
    } catch (error) {
      logger.error('Erro ao verificar health check', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  /**
   * GET /api/ping
   * Endpoint simples para verificar se a API está respondendo
   */
  public ping = (req: Request, res: Response) => {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  };
}

export const healthController = new HealthController();