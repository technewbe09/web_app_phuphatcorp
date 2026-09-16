import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useI18n } from '../../i18n/useI18n';
import { formatDate } from '../../utils/format';
import type { PricingMode, RoutePriceVersion } from '../../api/routePricingApi';
import { formatTierRangeLabel } from './priceDisplay';

export type AdjustChange = {
  key: string;
  label: string;
  from: number;
  to: number;
};

type Props = {
  version: RoutePriceVersion;
  laterVersions: RoutePriceVersion[];
  onClose: () => void;
  onConfirm: (body: {
    pallet_trip_price: number;
    tiers: { id: number; price: number }[];
  }) => void;
  isSubmitting: boolean;
};

function parsePrice(raw: string): number | null {
  const n = Number(String(raw).replace(/,/g, '').trim());
  if (String(raw).trim() === '' || Number.isNaN(n)) return null;
  return n;
}

export function PeriodPriceAdjustModal({
  version,
  laterVersions,
  onClose,
  onConfirm,
  isSubmitting,
}: Props) {
  const { t } = useI18n();
  const mode: PricingMode = version.pricing_mode ?? 'by_weight';
  const [pallet, setPallet] = useState(String(version.pallet_trip_price ?? 0));
  const [tierPrices, setTierPrices] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      version.tiers
        .filter((tier) => tier.id != null)
        .map((tier) => [tier.id!, String(tier.price)]),
    ),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const changes = useMemo((): AdjustChange[] => {
    const list: AdjustChange[] = [];
    const palletNum = parsePrice(pallet);
    if (palletNum != null && palletNum !== Number(version.pallet_trip_price)) {
      list.push({
        key: 'pallet',
        label: 'Pallet',
        from: Number(version.pallet_trip_price),
        to: palletNum,
      });
    }
    for (const tier of version.tiers) {
      if (tier.id == null) continue;
      const next = parsePrice(tierPrices[tier.id] ?? '');
      if (next != null && next !== Number(tier.price)) {
        list.push({
          key: `tier:${tier.id}`,
          label: formatTierRangeLabel(mode, tier),
          from: Number(tier.price),
          to: next,
        });
      }
    }
    return list;
  }, [pallet, tierPrices, version, mode]);

  const laterSorted = useMemo(
    () =>
      [...laterVersions].sort(
        (a, b) => String(a.effective_from).localeCompare(String(b.effective_from)),
      ),
    [laterVersions],
  );

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const palletNum = parsePrice(pallet);
    if (palletNum == null) errors.pallet = t('routePricing.validation.priceInvalid');
    else if (palletNum < 0) errors.pallet = t('routePricing.validation.priceMin0');
    for (const tier of version.tiers) {
      if (tier.id == null) continue;
      const key = `tier:${tier.id}`;
      const n = parsePrice(tierPrices[tier.id] ?? '');
      if (n == null) errors[key] = t('routePricing.validation.priceRequired');
      else if (n < 0) errors[key] = t('routePricing.validation.priceMin0');
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildBody() {
    return {
      pallet_trip_price: parsePrice(pallet) ?? 0,
      tiers: version.tiers
        .filter((tier) => tier.id != null)
        .map((tier) => ({
          id: tier.id!,
          price: parsePrice(tierPrices[tier.id!] ?? '') ?? Number(tier.price),
        })),
    };
  }

  function losesMark(v: RoutePriceVersion): boolean {
    return changes.some((c) => {
      if (c.key === 'pallet') return Boolean(v.pallet_manual_adjusted);
      const id = Number(c.key.replace('tier:', ''));
      const tier = v.tiers.find((x) => x.id === id);
      if (!tier) {
        // match by label fingerprint approx — later version same structure: compare by index/label
        const src = version.tiers.find((x) => x.id === id);
        if (!src) return false;
        const matched = v.tiers.find(
          (x) => formatTierRangeLabel(mode, x) === formatTierRangeLabel(mode, src),
        );
        return Boolean(matched?.is_manual_adjusted);
      }
      return Boolean(tier.is_manual_adjusted);
    });
  }

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={t('routePricing.manage.adjustPricePeriod', {
          date: formatDate(version.effective_from),
        })}
        size="lg"
      >
        <p className="text-sm text-neutral-500 mb-4">{t('routePricing.manage.adjustHint')}</p>
        <div className="space-y-4">
          <div>
            <Input
              label="Giá Pallet (chuyến)"
              type="number"
              min={0}
              value={pallet}
              onChange={(e) => setPallet(e.target.value)}
              error={fieldErrors.pallet}
            />
          </div>
          <div className="overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-3 py-2 font-medium">Bậc</th>
                  <th className="px-3 py-2 font-medium">Đơn vị</th>
                  <th className="px-3 py-2 font-medium text-right">Đơn giá (vnđ)</th>
                </tr>
              </thead>
              <tbody>
                {version.tiers.map((tier) => {
                  if (tier.id == null) return null;
                  const errKey = `tier:${tier.id}`;
                  return (
                    <tr
                      key={tier.id}
                      className="border-t border-neutral-100 dark:border-neutral-800 align-top"
                    >
                      <td className="px-3 py-2 whitespace-pre-line break-words">
                        {formatTierRangeLabel(mode, tier)}
                      </td>
                      <td className="px-3 py-2">
                        {tier.pricing_unit === 'chuyen' ? 'vnđ/chuyến' : 'vnđ/tấn'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          className="text-right"
                          value={tierPrices[tier.id] ?? ''}
                          onChange={(e) =>
                            setTierPrices((prev) => ({ ...prev, [tier.id!]: e.target.value }))
                          }
                          error={fieldErrors[errKey]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onClose}>
            {t('routePricing.action.cancel')}
          </Button>
          <Button
            disabled={changes.length === 0 || isSubmitting}
            onClick={() => {
              if (!validate()) return;
              setConfirmOpen(true);
            }}
          >
            {t('routePricing.manage.saveAdjust')}
          </Button>
        </div>
      </Modal>

      {confirmOpen && (
        <Modal
          isOpen
          onClose={() => !isSubmitting && setConfirmOpen(false)}
          title={t('routePricing.manage.confirmTitle')}
          size="md"
        >
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-neutral-800 dark:text-neutral-100 mb-2">
                {t('routePricing.manage.confirmChanges')}
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {changes.map((c) => (
                  <li key={c.key}>
                    {c.label}: {c.from.toLocaleString('vi-VN')} → {c.to.toLocaleString('vi-VN')}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-neutral-800 dark:text-neutral-100 mb-2">
                {t('routePricing.manage.confirmLaterPeriods')}
              </p>
              {laterSorted.length === 0 ? (
                <p className="text-neutral-500">{t('routePricing.manage.confirmNoLater')}</p>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {laterSorted.map((v) => (
                    <li key={v.id}>
                      {formatDate(v.effective_from)}
                      {losesMark(v) ? ` — ${t('routePricing.manage.confirmLoseMark')}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setConfirmOpen(false)}
            >
              {t('routePricing.action.cancel')}
            </Button>
            <Button
              isLoading={isSubmitting}
              disabled={isSubmitting}
              onClick={() => onConfirm(buildBody())}
            >
              {t('routePricing.manage.confirmSubmit')}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
