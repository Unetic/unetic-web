import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SystemApiService {
  async optimizeMesh(): Promise<void> {
    const response = await fetch('/api/mesh/optimize', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to optimize mesh: ${response.statusText}`);
    }
  }
}
