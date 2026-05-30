import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Calculator,
  Factory,
  PackageCheck,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sprout,
  TrendingDown,
} from "lucide-react";
import { useMemo, useState } from "react";

type SpecKey = "five" | "eight" | "ten";

type BatchInput = {
  batchNo: string;
  processDate: string;
  rawAWeight: number;
  rawBWeight: number;
  productBoxes: Record<SpecKey, number>;
  defectiveWeight: number;
  lossWeight: number;
};

type Page = "entry" | "result";

const RAW_A_COST = 2;
const RAW_B_COST = 3;

const PRODUCT_SPECS: Array<{ key: SpecKey; label: string; weight: number }> = [
  { key: "five", label: "5斤装", weight: 5 },
  { key: "eight", label: "8斤装", weight: 8 },
  { key: "ten", label: "10斤装", weight: 10 },
];

const DEFAULT_INPUT: BatchInput = {
  batchNo: "JG20260530-001",
  processDate: "2026-05-30",
  rawAWeight: 1200,
  rawBWeight: 800,
  productBoxes: {
    five: 120,
    eight: 80,
    ten: 45,
  },
  defectiveWeight: 220,
  lossWeight: 90,
};

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const weightFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function normalizeNumber(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function money(value: number) {
  return `¥${currencyFormatter.format(value)}`;
}

function signedMoney(value: number) {
  if (value === 0) {
    return money(0);
  }

  return `${value > 0 ? "+" : "-"}${money(Math.abs(value))}`;
}

function weight(value: number) {
  return `${weightFormatter.format(value)}斤`;
}

function percent(value: number) {
  return `${currencyFormatter.format(value)}%`;
}

function calculateBatch(input: BatchInput) {
  const rawAWeight = normalizeNumber(input.rawAWeight);
  const rawBWeight = normalizeNumber(input.rawBWeight);
  const defectiveWeight = normalizeNumber(input.defectiveWeight);
  const lossWeight = normalizeNumber(input.lossWeight);

  const finishedRows = PRODUCT_SPECS.map((spec) => {
    const boxes = normalizeNumber(input.productBoxes[spec.key]);
    const outputWeight = boxes * spec.weight;

    return {
      ...spec,
      boxes,
      outputWeight,
    };
  });

  const totalInputWeight = rawAWeight + rawBWeight;
  const rawACost = rawAWeight * RAW_A_COST;
  const rawBCost = rawBWeight * RAW_B_COST;
  const totalRawCost = rawACost + rawBCost;
  const unitCost = totalInputWeight > 0 ? totalRawCost / totalInputWeight : 0;
  const finishedWeight = finishedRows.reduce((sum, item) => sum + item.outputWeight, 0);
  const totalOutputWeight = finishedWeight + defectiveWeight + lossWeight;
  const outputGap = totalInputWeight - totalOutputWeight;
  const isOverOutput = outputGap < -0.0001;
  const unallocatedWeight = outputGap > 0 ? outputGap : 0;
  const finishedCost = finishedWeight * unitCost;
  const defectiveCost = defectiveWeight * unitCost;
  const lossCost = lossWeight * unitCost;
  const lossRate = totalInputWeight > 0 ? (lossWeight / totalInputWeight) * 100 : 0;

  return {
    rawAWeight,
    rawBWeight,
    defectiveWeight,
    lossWeight,
    rawACost,
    rawBCost,
    totalInputWeight,
    totalRawCost,
    unitCost,
    finishedRows: finishedRows.map((item) => {
      const allocatedCost = item.outputWeight * unitCost;

      return {
        ...item,
        allocatedCost,
        boxCost: item.boxes > 0 ? allocatedCost / item.boxes : 0,
      };
    }),
    finishedWeight,
    totalOutputWeight,
    isOverOutput,
    unallocatedWeight,
    outputGap,
    finishedCost,
    defectiveCost,
    lossCost,
    lossRate,
  };
}

function App() {
  const [page, setPage] = useState<Page>("entry");
  const [form, setForm] = useState<BatchInput>(DEFAULT_INPUT);
  const result = useMemo(() => calculateBatch(form), [form]);

  const canSubmit = result.totalInputWeight > 0 && !result.isOverOutput;

  function updateNumber(key: keyof BatchInput, value: string) {
    setForm((current) => ({
      ...current,
      [key]: Number(value),
    }));
  }

  function updateBoxes(key: SpecKey, value: string) {
    setForm((current) => ({
      ...current,
      productBoxes: {
        ...current.productBoxes,
        [key]: Number(value),
      },
    }));
  }

  return (
    <div className="app-shell">
      <main className="phone-frame">
        {page === "entry" ? (
          <EntryPage
            form={form}
            result={result}
            canSubmit={canSubmit}
            onChangeText={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
            onChangeNumber={updateNumber}
            onChangeBoxes={updateBoxes}
            onBalanceLoss={() => {
              setForm((current) => {
                const currentResult = calculateBatch(current);

                return {
                  ...current,
                  lossWeight: normalizeNumber(current.lossWeight) + currentResult.unallocatedWeight,
                };
              });
            }}
            onReset={() => setForm(DEFAULT_INPUT)}
            onSubmit={() => {
              if (canSubmit) {
                setPage("result");
              }
            }}
          />
        ) : (
          <ResultPage form={form} result={result} onBack={() => setPage("entry")} />
        )}
      </main>
    </div>
  );
}

type Calculation = ReturnType<typeof calculateBatch>;

function EntryPage({
  form,
  result,
  canSubmit,
  onChangeText,
  onChangeNumber,
  onChangeBoxes,
  onBalanceLoss,
  onReset,
  onSubmit,
}: {
  form: BatchInput;
  result: Calculation;
  canSubmit: boolean;
  onChangeText: (key: "batchNo" | "processDate", value: string) => void;
  onChangeNumber: (key: "rawAWeight" | "rawBWeight" | "defectiveWeight" | "lossWeight", value: string) => void;
  onChangeBoxes: (key: SpecKey, value: string) => void;
  onBalanceLoss: () => void;
  onReset: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">产地加工</p>
          <h1>加工批次录入</h1>
        </div>
        <button className="icon-button" type="button" aria-label="重置示例数据" onClick={onReset}>
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="summary-strip">
        <Metric label="投入重量" value={weight(result.totalInputWeight)} />
        <Metric label="产出重量" value={weight(result.totalOutputWeight)} />
        <Metric label="原料成本" value={money(result.totalRawCost)} />
      </section>

      {result.isOverOutput ? (
        <div className="alert error">
          <ShieldAlert size={18} />
          <span>产出比投入多 {weight(Math.abs(result.outputGap))}，请调整原料或产出数据。</span>
        </div>
      ) : result.unallocatedWeight > 0 ? (
        <div className="alert warning">
          <Scale size={18} />
          <span>还有 {weight(result.unallocatedWeight)} 未分配，结果页会作为数据未平衡提醒。</span>
          <button className="alert-action" type="button" onClick={onBalanceLoss}>
            计入损耗
          </button>
        </div>
      ) : (
        <div className="alert success">
          <PackageCheck size={18} />
          <span>投入与产出重量已平衡，可以查看成本结转结果。</span>
        </div>
      )}

      <div className="form-stack">
        <Card title="批次信息" icon={<Factory size={18} />}>
          <label className="field">
            <span>加工批次</span>
            <input
              value={form.batchNo}
              onChange={(event) => onChangeText("batchNo", event.target.value)}
              placeholder="请输入批次号"
            />
          </label>
          <label className="field">
            <span>加工日期</span>
            <input
              type="date"
              value={form.processDate}
              onChange={(event) => onChangeText("processDate", event.target.value)}
            />
          </label>
        </Card>

        <Card title="原料投入" icon={<Sprout size={18} />}>
          <NumberField
            label="原料果 A"
            suffix="斤"
            value={form.rawAWeight}
            helper="成本价 2 元/斤"
            onChange={(value) => onChangeNumber("rawAWeight", value)}
          />
          <NumberField
            label="原料果 B"
            suffix="斤"
            value={form.rawBWeight}
            helper="成本价 3 元/斤"
            onChange={(value) => onChangeNumber("rawBWeight", value)}
          />
        </Card>

        <Card title="成品产出" icon={<Boxes size={18} />}>
          {PRODUCT_SPECS.map((spec) => (
            <NumberField
              key={spec.key}
              label={spec.label}
              suffix="箱"
              value={form.productBoxes[spec.key]}
              helper={`自动折算 ${weight(form.productBoxes[spec.key] * spec.weight)}`}
              onChange={(value) => onChangeBoxes(spec.key, value)}
            />
          ))}
        </Card>

        <Card title="次果与损耗" icon={<TrendingDown size={18} />}>
          <NumberField
            label="次果"
            suffix="斤"
            value={form.defectiveWeight}
            helper="可入库的低等级产出"
            onChange={(value) => onChangeNumber("defectiveWeight", value)}
          />
          <NumberField
            label="损耗"
            suffix="斤"
            value={form.lossWeight}
            helper="不入库，但归集损耗成本"
            onChange={(value) => onChangeNumber("lossWeight", value)}
          />
        </Card>
      </div>

      <footer className="sticky-actions">
        <button className="primary-button" type="button" disabled={!canSubmit} onClick={onSubmit}>
          <Calculator size={18} />
          查看结果
        </button>
      </footer>
    </section>
  );
}

function ResultPage({
  form,
  result,
  onBack,
}: {
  form: BatchInput;
  result: Calculation;
  onBack: () => void;
}) {
  const inventoryRows = [
    { name: "原料果 A", change: -result.rawAWeight, cost: -result.rawACost, note: "加工消耗" },
    { name: "原料果 B", change: -result.rawBWeight, cost: -result.rawBCost, note: "加工消耗" },
    { name: "成品果", change: result.finishedWeight, cost: result.finishedCost, note: "按规格入库" },
    { name: "次果", change: result.defectiveWeight, cost: result.defectiveCost, note: "低等级入库" },
    { name: "损耗", change: 0, cost: result.lossCost, note: "只记录成本" },
  ];

  return (
    <section className="screen">
      <header className="screen-header compact">
        <button className="icon-button" type="button" aria-label="返回录入页" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="eyebrow">批次 {form.batchNo}</p>
          <h1>加工结果</h1>
        </div>
      </header>

      <section className="hero-panel">
        <div>
          <span className="hero-label">加权单位成本</span>
          <strong>{money(result.unitCost)}</strong>
          <span className="hero-sub">每斤产出按投入平均成本结转</span>
        </div>
        <BarChart3 size={38} />
      </section>

      {result.unallocatedWeight > 0 && (
        <div className="alert warning">
          <Scale size={18} />
          <span>本批次仍有 {weight(result.unallocatedWeight)} 未分配，建议复核分选数据。</span>
        </div>
      )}

      <div className="result-grid">
        <Metric label="投入成本" value={money(result.totalRawCost)} />
        <Metric label="成品入库" value={weight(result.finishedWeight)} />
        <Metric label="次果入库" value={weight(result.defectiveWeight)} />
        <Metric label="损耗率" value={percent(result.lossRate)} />
      </div>

      <Card title="库存变化" icon={<Boxes size={18} />}>
        <div className="table-list">
          {inventoryRows.map((row) => (
            <div className="table-row" key={row.name}>
              <div>
                <strong>{row.name}</strong>
                <span>{row.note}</span>
              </div>
              <div className="right">
                <strong className={row.change < 0 ? "negative" : row.change > 0 ? "positive" : "neutral"}>
                  {row.change === 0 ? "不入库" : `${row.change > 0 ? "+" : ""}${weight(row.change)}`}
                </strong>
                <span>{signedMoney(row.cost)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="成品规格成本" icon={<PackageCheck size={18} />}>
        <div className="spec-list">
          {result.finishedRows.map((row) => (
            <div className="spec-item" key={row.key}>
              <div className="spec-title">
                <strong>{row.label}</strong>
                <span>{row.boxes}箱 / {weight(row.outputWeight)}</span>
              </div>
              <div className="spec-metrics">
                <span>分摊 {money(row.allocatedCost)}</span>
                <span>单箱 {money(row.boxCost)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="成本结转摘要" icon={<Calculator size={18} />}>
        <div className="cost-flow">
          <SummaryLine label="原料 A 成本" value={`${weight(result.rawAWeight)} × ¥${RAW_A_COST} = ${money(result.rawACost)}`} />
          <SummaryLine label="原料 B 成本" value={`${weight(result.rawBWeight)} × ¥${RAW_B_COST} = ${money(result.rawBCost)}`} />
          <SummaryLine label="成品分摊" value={money(result.finishedCost)} />
          <SummaryLine label="次果分摊" value={money(result.defectiveCost)} />
          <SummaryLine label="损耗成本" value={money(result.lossCost)} />
        </div>
      </Card>
    </section>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="card-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NumberField({
  label,
  suffix,
  helper,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  helper: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="number-input">
        <input
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <em>{suffix}</em>
      </div>
      <small>{helper}</small>
    </label>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
