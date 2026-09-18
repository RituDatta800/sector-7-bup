/**
 * Single responsibility: End-to-end integration test for POST /optimize-energy endpoint.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';

describe('OptimizeEnergyController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/optimize-energy (POST) should return structured response', async () => {
    const payload = {
      scenario_id: 'test-123',
      operator_notes: ['No charging from 1 PM to 3 PM'],
      battery: {
        capacity_kwh: 100,
        initial_energy_kwh: 50,
        minimum_energy_kwh: 10,
        max_charge_kwh_per_hour: 20,
        max_discharge_kwh_per_hour: 20
      },
      hours: Array.from({ length: 24 }).map((_, i) => ({
        hour: i,
        demand_kwh: 10,
        solar_kwh: i > 8 && i < 16 ? 15 : 0,
        tariff_bdt_per_kwh: 5
      }))
    };

    const response = await app.inject({
      method: 'POST',
      url: '/optimize-energy',
      payload,
    });

    // The endpoint should handle the mock LLM failure/fallback successfully
    expect(response.statusCode).toEqual(200);
    const body = JSON.parse(response.payload);
    expect(body.scenario_id).toBe('test-123');
    expect(Array.isArray(body.directive_interpretation)).toBe(true);
    expect(Array.isArray(body.hourly_plan)).toBe(true);
    expect(body.hourly_plan.length).toBe(24);
    expect(typeof body.total_cost_bdt).toBe('number');
  });
});
