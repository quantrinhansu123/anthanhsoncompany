/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Marketing } from './pages/Marketing';
import { HumanResources } from './pages/HumanResources';
import { Logistics } from './pages/Logistics';
import { Administration } from './pages/Administration';
import { System } from './pages/System';
import { RecruitmentList } from './pages/human-resources/RecruitmentList';
import { Finance } from './pages/Finance';
import { Customer } from './pages/Customer';
import { Process } from './pages/Process';
import { Timekeeping } from './pages/administration/Timekeeping';
import { TimekeepingSummary } from './pages/administration/TimekeepingSummary';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { AdministrativeTickets } from './pages/administration/AdministrativeTickets';
import { KPIGrading } from './pages/administration/KPIGrading';
import { BonusPenalty } from './pages/administration/BonusPenalty';
import { SalarySettings } from './pages/administration/SalarySettings';
import { SalaryTable } from './pages/administration/SalaryTable';
import { AIAssistant } from './pages/AIAssistant';
import { DanhSachVanDon } from './pages/logistics/DanhSachVanDon';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="ho-so-ca-nhan" element={<Profile />} />
          <Route path="hanh-chinh" element={<Administration />} />
          <Route path="hanh-chinh/cham-cong" element={<Timekeeping />} />
          <Route path="hanh-chinh/tong-hop-cham-cong" element={<TimekeepingSummary />} />
          <Route path="hanh-chinh/phieu-hanh-chinh" element={<AdministrativeTickets />} />
          <Route path="hanh-chinh/cham-diem-kpi" element={<KPIGrading />} />
          <Route path="hanh-chinh/diem-cong-tru" element={<BonusPenalty />} />
          <Route path="hanh-chinh/thiet-lap-cong-luong" element={<SalarySettings />} />
          <Route path="hanh-chinh/bang-luong" element={<SalaryTable />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="nhan-su" element={<HumanResources />} />
          <Route path="nhan-su/ho-so" element={<RecruitmentList />} />
          <Route path="kho-van" element={<Logistics />} />
          <Route path="kho-van/danh-sach-van-don" element={<DanhSachVanDon />} />
          <Route path="he-thong" element={<System />} />
          <Route path="tai-chinh" element={<Finance />} />
          <Route path="khach-hang" element={<Customer />} />
          <Route path="quy-trinh" element={<Process />} />
          <Route path="tro-ly-ai" element={<AIAssistant />} />
          <Route path="settings" element={<Settings />} />
          {/* Placeholder routes for other paths to avoid 404s inside the layout */}
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
