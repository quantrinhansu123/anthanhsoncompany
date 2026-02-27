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

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="hanh-chinh" element={<Administration />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="nhan-su" element={<HumanResources />} />
          <Route path="nhan-su/ho-so" element={<RecruitmentList />} />
          <Route path="kho-van" element={<Logistics />} />
          <Route path="he-thong" element={<System />} />
          <Route path="tai-chinh" element={<Finance />} />
          {/* Placeholder routes for other paths to avoid 404s inside the layout */}
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
