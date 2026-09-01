import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import type { FeatureWithRoleConfigs } from '../../../types/user';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/api';
import { useI18n } from '../../../i18n/useI18n';
import { User, Check, Car } from 'lucide-react';

interface AssignEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  features: FeatureWithRoleConfigs[];
  onSubmit: (data: {
    user_id: number;
    feature_code: string;
    entity_type: string;
    entity_ids: number[];
  }) => Promise<void>;
  isSubmitting: boolean;
}

interface SimpleUser {
  id: number;
  username: string;
  full_name: string;
  role_name?: string;
}

interface SimpleVehicle {
  id: number;
  plate_number: string;
  driver_name: string;
  vehicle_type: string;
}

export const AssignEntityModal: React.FC<AssignEntityModalProps> = ({
  isOpen,
  onClose,
  features,
  onSubmit,
  isSubmitting,
}) => {
  const { t } = useI18n();
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedFeatureCode, setSelectedFeatureCode] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('vehicle');
  const [selectedEntityIds, setSelectedEntityIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sync default feature & entity type whenever modal opens or features load
  useEffect(() => {
    if (isOpen && features.length > 0) {
      const validFeature = features.find((f) => f.entity_types && f.entity_types.length > 0);
      if (validFeature) {
        setSelectedFeatureCode(validFeature.feature_code);
        setSelectedEntityType(validFeature.entity_types[0] || 'vehicle');
      }
      setSelectedUserId('');
      setSelectedEntityIds([]);
      setError(null);
    }
  }, [isOpen, features]);

  // Fetch list of users for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users', 'all-simple'],
    queryFn: async () => {
      const res = await axiosClient.get<ApiResponse<{ users: SimpleUser[] }>>('/users?limit=100');
      return res.data.data.users || [];
    },
    enabled: isOpen,
  });

  // Fetch vehicles for vehicle selection
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', 'all-simple'],
    queryFn: async () => {
      const res = await axiosClient.get<ApiResponse<{ vehicles: SimpleVehicle[] }>>('/vehicles?limit=200');
      return res.data.data?.vehicles || [];
    },
    enabled: isOpen && selectedEntityType === 'vehicle',
  });

  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : [];
  const availableEntities = selectedEntityType === 'vehicle' ? vehicles : (Array.isArray(users) ? users : []);

  const handleToggleEntity = (id: number) => {
    setSelectedEntityIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedEntityIds.length === availableEntities.length) {
      setSelectedEntityIds([]);
    } else {
      setSelectedEntityIds(availableEntities.map((e: any) => e.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUserId) {
      setError('Vui lòng chọn người dùng');
      return;
    }

    if (!selectedFeatureCode) {
      setError('Vui lòng chọn tính năng');
      return;
    }

    if (selectedEntityIds.length === 0) {
      setError('Vui lòng chọn ít nhất một đối tượng để gán');
      return;
    }

    try {
      await onSubmit({
        user_id: Number(selectedUserId),
        feature_code: selectedFeatureCode,
        entity_type: selectedEntityType,
        entity_ids: selectedEntityIds,
      });
      onClose();
      setSelectedEntityIds([]);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Lỗi khi gán đối tượng');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gán đối tượng cho người dùng" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Người dùng cần gán <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(Number(e.target.value) || '')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-400"
              required
            >
              <option value="">-- Chọn người dùng --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.username} (@{u.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Tính năng <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedFeatureCode}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedFeatureCode(code);
                const feat = features.find((f) => f.feature_code === code);
                if (feat?.entity_types?.[0]) {
                  setSelectedEntityType(feat.entity_types[0]);
                }
                setSelectedEntityIds([]);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-400"
              required
            >
              <option value="">-- Chọn tính năng --</option>
              {features
                .filter((f) => f.entity_types && f.entity_types.length > 0)
                .map((f) => (
                  <option key={f.feature_code} value={f.feature_code}>
                    {f.feature_name} ({f.module})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Chọn danh sách {selectedEntityType === 'vehicle' ? 'Biển số xe' : 'Đối tượng'} ({t(`data_scopes.entities.${selectedEntityType}` as never) || selectedEntityType}) <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              {selectedEntityIds.length === availableEntities.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg p-2 space-y-1 bg-neutral-50 dark:bg-neutral-900/50">
            {selectedEntityType === 'vehicle' ? (
              vehicles.length === 0 ? (
                <div className="text-xs text-neutral-400 p-3 text-center">Không có dữ liệu xe</div>
              ) : (
                vehicles.map((v) => {
                  const isChecked = selectedEntityIds.includes(v.id);
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleToggleEntity(v.id)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-sm ${
                        isChecked
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold">{v.plate_number}</span>
                        {v.driver_name && (
                          <span className="text-xs text-neutral-500">({v.driver_name})</span>
                        )}
                      </div>
                      {isChecked && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                  );
                })
              )
            ) : (
              users.map((entityUser) => {
                const isChecked = selectedEntityIds.includes(entityUser.id);
                return (
                  <div
                    key={entityUser.id}
                    onClick={() => handleToggleEntity(entityUser.id)}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-sm ${
                      isChecked
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-neutral-400" />
                      <span className="font-medium">{entityUser.full_name || entityUser.username}</span>
                      <span className="text-xs text-neutral-400 font-mono">@{entityUser.username}</span>
                    </div>
                    {isChecked && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Gán đối tượng
          </Button>
        </div>
      </form>
    </Modal>
  );
};
