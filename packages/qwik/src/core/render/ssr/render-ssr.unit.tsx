import type { JSXNode } from '@builder.io/qwik/jsx-runtime';
import { suite } from 'uvu';
import { equal, snapshot } from 'uvu/assert';
import { createSimpleDocument } from '../../../server/document';
import { format } from 'prettier';

import type { StreamWriter } from '../../../server/types';
import { component$ } from '../../component/component.public';
import { inlinedQrl } from '../../import/qrl';
import { $ } from '../../import/qrl.public';
import { createContext, useContext, useContextProvider } from '../../use/use-context';
import { useOn, useOnDocument, useOnWindow } from '../../use/use-on';
import { Ref, useRef } from '../../use/use-ref';
import { Resource, useResource$ } from '../../use/use-resource';
import { useStylesScopedQrl, useStylesQrl } from '../../use/use-styles';
import { useClientEffect$ } from '../../use/use-watch';
import { delay } from '../../util/promises';
import { SSRComment } from '../jsx/host.public';
import { Slot } from '../jsx/slot.public';
import { renderSSR, RenderSSROptions } from './render-ssr';
import { useStore } from '../../use/use-store.public';

const renderSSRSuite = suite('renderSSR');
renderSSRSuite('render attributes', async () => {
  await testSSR(
    <div id="stuff" aria-required="true" role=""></div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div id="stuff" aria-required="true" role></div></html>'
  );
});

renderSSRSuite('render className', async () => {
  await testSSR(
    <div className="stuff"></div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div class="stuff"></div></html>'
  );
});

renderSSRSuite('render class', async () => {
  await testSSR(
    <div
      class={{
        stuff: true,
        other: false,
      }}
    ></div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div class="stuff"></div></html>'
  );
});

renderSSRSuite('render contentEditable', async () => {
  await testSSR(
    <div contentEditable="true"></div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div contentEditable="true"></div></html>'
  );
});

renderSSRSuite('self closing elements', async () => {
  await testSSR(
    <input></input>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><input></html>'
  );
});

renderSSRSuite('single simple children', async () => {
  await testSSR(
    <div>hola</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div>hola</div></html>'
  );
  await testSSR(
    <div>{0}</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div>0</div></html>'
  );
  await testSSR(
    <div>{true}</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div></div></html>'
  );
  await testSSR(
    <div>{false}</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div></div></html>'
  );
  await testSSR(
    <div>{null}</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div></div></html>'
  );
  await testSSR(
    <div>{undefined}</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div></div></html>'
  );
});

renderSSRSuite('events', async () => {
  await testSSR(
    <div onClick$={() => console.warn('hol')}>hola</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div q:id="0" on:click="/runtimeQRL#_">hola</div></html>'
  );
  await testSSR(
    <div document:onClick$={() => console.warn('hol')}>hola</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div q:id="0" on-document:click="/runtimeQRL#_">hola</div></html>'
  );
  await testSSR(
    <div window:onClick$={() => console.warn('hol')}>hola</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div q:id="0" on-window:click="/runtimeQRL#_">hola</div></html>'
  );
  await testSSR(
    <input onInput$={() => console.warn('hol')} />,
    '<html q:container="paused" q:version="dev" q:render="ssr"><input q:id="0" on:input="/runtimeQRL#_"></html>'
  );
});

renderSSRSuite('ref', async () => {
  const ref = { current: undefined } as Ref<any>;
  await testSSR(
    <div ref={ref}></div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div q:id="0"></div></html>'
  );
});
renderSSRSuite('innerHTML', async () => {
  await testSSR(
    <div dangerouslySetInnerHTML="<p>hola</p>"></div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div><p>hola</p></div></html>'
  );
});

renderSSRSuite('single complex children', async () => {
  await testSSR(
    <div>
      <p>hola</p>
    </div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div><p>hola</p></div></html>'
  );
  await testSSR(
    <div>
      hola {2}
      <p>hola</p>
    </div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div>hola 2<p>hola</p></div></html>'
  );
});

renderSSRSuite('single multiple children', async () => {
  await testSSR(
    <ul>
      <li>1</li>
      <li>2</li>
      <li>3</li>
      <li>4</li>
      <li>5</li>
      <li>6</li>
      <li>7</li>
      <li>8</li>
    </ul>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li><li>6</li><li>7</li><li>8</li></ul></html>'
  );
});

renderSSRSuite('sanitazion', async () => {
  await testSSR(
    <>
      <style>{`.rule > thing{}`}</style>
      <script>{`.rule > thing{}`}</script>
      <div>{`.rule > thing{}`}</div>
    </>,
    `<html q:container="paused" q:version="dev" q:render="ssr"><style>.rule > thing{}</style><script>.rule > thing{}</script><div>.rule &gt; thing{}</div></html>`
  );
});

renderSSRSuite('using fragment', async () => {
  await testSSR(
    <ul>
      <>
        <li>1</li>
        <li>2</li>
      </>
      <li>3</li>
      <>
        <li>4</li>
        <>
          <li>5</li>
          <>
            <>
              <li>6</li>
            </>
          </>
        </>
        <li>7</li>
      </>
      <li>8</li>
    </ul>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li><li>6</li><li>7</li><li>8</li></ul></html>'
  );
});

renderSSRSuite('using promises', async () => {
  await testSSR(
    <div>{Promise.resolve('hola')}</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div>hola</div></html>'
  );
  await testSSR(
    <div>{Promise.resolve(<p>hola</p>)}</div>,
    '<html q:container="paused" q:version="dev" q:render="ssr"><div><p>hola</p></div></html>'
  );

  await testSSR(
    <ul>
      {Promise.resolve(<li>1</li>)}
      <li>2</li>
      {delay(100).then(() => (
        <li>3</li>
      ))}
      {delay(10).then(() => (
        <li>4</li>
      ))}
    </ul>,
    [
      '<html',
      ' q:container="paused"',
      ' q:version="dev"',
      ' q:render="ssr"',
      '>',
      '<ul',
      '>',
      '<li',
      '>',
      '1',
      '</li>',
      '<li',
      '>',
      '2',
      '</li>',
      '<li',
      '>',
      '3',
      '</li>',
      '<li',
      '>',
      '4',
      '</li>',
      '</ul>',
      '</html>',
    ]
  );
});

renderSSRSuite('DelayResource', async () => {
  await testSSR(
    <ul>
      <DelayResource text="thing" delay={100} />
      <DelayResource text="thing" delay={10} />
    </ul>,
    `<html q:container="paused" q:version="dev" q:render="ssr">
    <ul>
      <!--qv q:id=1 q:key=sX:-->
        <style q:style="fio5tb-0">.cmp {background: blue}</style>
        <div class="cmp"><span>thing</span></div>
      <!--/qv-->
      <!--qv q:id=0 q:key=sX:-->
        <div class="cmp"><span>thing</span></div>
      <!--/qv-->
    </ul>
  </html>`
  );
});

renderSSRSuite('using promises with DelayResource', async () => {
  await testSSR(
    <ul>
      {delay(10).then(() => (
        <li>thing</li>
      ))}
      <DelayResource text="thing" delay={500} />
    </ul>,
    `<html q:container="paused" q:version="dev" q:render="ssr">
      <ul>
        <li>thing</li>
        <!--qv q:id=0 q:key=sX:-->
          <style q:style="fio5tb-0">.cmp {background: blue}</style>
          <div class="cmp"><span>thing</span></div>
        <!--/qv-->
      </ul>
    </html>`
  );
});

renderSSRSuite('using component', async () => {
  await testSSR(
    <MyCmp />,
    `<html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
      <section><div>MyCmp{}</div></section>
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('using component with key', async () => {
  await testSSR(
    <MyCmp key="hola" />,
    `<html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:hola-->
      <section><div>MyCmp{}</div></section>
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('using component props', async () => {
  await testSSR(
    <MyCmp id="12" host:prop="attribute" innerHTML="123" dangerouslySetInnerHTML="432" prop="12" />,
    `
    <html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
      <section>
        <div>MyCmp{"id":"12","host:prop":"attribute","innerHTML":"123","dangerouslySetInnerHTML":"432","prop":"12"}</div>
      </section>
      <!--/qv-->
    </html>
    `
  );
});

renderSSRSuite('using component project content', async () => {
  await testSSR(
    <MyCmp>
      <div>slot</div>
    </MyCmp>,
    `
  <html q:container="paused" q:version="dev" q:render="ssr">
    <!--qv q:id=0 q:key=sX:-->
    <section><div>MyCmp{}</div></section>
    <q:template q:slot hidden aria-hidden="true"><div>slot</div></q:template>
    <!--/qv-->
  </html>
`
  );
});

renderSSRSuite('using complex component', async () => {
  await testSSR(
    <MyCmpComplex></MyCmpComplex>,
    `<html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
      <div q:id="1" on:click="/runtimeQRL#_">
        <button q:id="2" on:click="/runtimeQRL#_">Click</button>
        <!--qv q:sname q:sref=0 q:key--><!--/qv-->
      </div>
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('using complex component with slot', async () => {
  await testSSR(
    <MyCmpComplex>Hola</MyCmpComplex>,
    `
    <html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
      <div q:id="1" on:click="/runtimeQRL#_">
        <button q:id="2" on:click="/runtimeQRL#_">Click</button>
        <!--qv q:sname q:sref=0 q:key-->
        Hola
        <!--/qv-->
      </div>
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('<head>', async () => {
  await testSSR(
    <head>
      <title>hola</title>
      <>
        <meta></meta>
        <div>
          <p>hola</p>
        </div>
      </>
    </head>,
    `
  <html q:container="paused" q:version="dev" q:render="ssr">
    <head q:head>
      <title q:head>hola</title>
      <meta q:head>
      <div q:head>
        <p>hola</p>
      </div>
    </head>
  </html>`
  );
});

renderSSRSuite('named slots', async () => {
  await testSSR(
    <NamedSlot>
      Text
      <div q:slot="start">START: 1</div>
      <>
        <div q:slot="end">END: 1</div>
        from
        <div q:slot="start">START: 2</div>
      </>
      <div q:slot="end">END: 2</div>
      default
    </NamedSlot>,
    `
    <html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
      <div>
        <!--qv q:sname=start q:sref=0 q:key=start-->
        <div q:slot="start">START: 1</div>
        <div q:slot="start">START: 2</div>
        <!--/qv-->
        <div><!--qv q:sname q:sref=0 q:key-->Textfromdefault<!--/qv--></div>
        <!--qv q:sname=end q:sref=0 q:key=end-->
        <div q:slot="end">END: 1</div>
        <div q:slot="end">END: 2</div>
        <!--/qv-->
      </div>
      <!--/qv-->
    </html>
`
  );
});

renderSSRSuite('nested slots', async () => {
  await testSSR(
    <SimpleSlot name="root">
      <SimpleSlot name="level 1">
        <SimpleSlot name="level 2">
          BEFORE CONTENT
          <div>Content</div>
          AFTER CONTENT
        </SimpleSlot>
      </SimpleSlot>
    </SimpleSlot>,
    `
    <html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
        <div id="root">
          Before root
          <!--qv q:sname q:sref=0 q:key-->
            <!--qv q:id=1 q:key=sX:-->
            <div id="level 1">
              Before level 1
              <!--qv q:sname q:sref=1 q:key-->
                <!--qv q:id=2 q:key=sX:-->
                  <div id="level 2">
                    Before level 2
                    <!--qv q:sname q:sref=2 q:key-->
                      BEFORE CONTENT
                      <div>Content</div>
                      AFTER CONTENT
                    <!--/qv-->
                    After level 2
                  </div>
                <!--/qv-->
              <!--/qv-->
              After level 1
            </div>
            <!--/qv-->
          <!--/qv-->
          After root
        </div>
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('mixes slots', async () => {
  await testSSR(
    <MixedSlot>Content</MixedSlot>,
    `
    <html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
      <!--qv q:id=1 q:key=sX:-->
        <div id="1">Before 1
        <!--qv q:sname q:sref=1 q:key-->
          <!--qv q:sname q:sref=0 q:key-->
            Content
          <!--/qv-->
        <!--/qv-->
        After 1
      </div>
      <!--/qv-->
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('component useContextProvider()', async () => {
  await testSSR(
    <Context>
      <ContextConsumer />
    </Context>,
    `<html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
        <!--qv q:sname q:sref=0 q:key-->
          <!--qv q:id=1 q:key=sX:-->hello bye<!--/qv-->
        <!--/qv-->
        <!--qv q:id=2 q:key=sX:-->hello bye<!--/qv-->
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('component useOn()', async () => {
  await testSSR(
    <Events />,
    `<html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
      <div q:id="1" on:click="/runtimeQRL#_\n/runtimeQRL#_" on-window:click="/runtimeQRL#_" on-document:click="/runtimeQRL#_"></div>
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('component useStyles()', async () => {
  await testSSR(
    <Styles />,
    `<html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
        <style q:style="17nc-0">.host {color: red}</style>
        <div class="host">
          Text
        </div>
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('component useStylesScoped()', async () => {
  await testSSR(
    <ScopedStyles1>
      <div>projected</div>
    </ScopedStyles1>,
    `<html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:sstyle=⭐️1d-0 q:id=0 q:key=sX:-->
      <style q:style="1d-0">.host.⭐️1d-0 {color: red}</style>
      <div class="⭐️1d-0 host">
        <div class="⭐️1d-0">
          Scoped1
          <!--qv q:sname q:sref=0 q:key-->
            <div>projected</div>
          <!--/qv-->
          <p class="⭐️1d-0">Que tal?</p>
        </div>
        <!--qv q:sstyle=⭐️f0gmsw-0 q:id=2 q:key=sX:-->
          <style q:style="f0gmsw-0">.host.⭐️f0gmsw-0 {color: blue}</style>
          <div class="⭐️f0gmsw-0 host">
            <div class="⭐️f0gmsw-0">
              Scoped2
              <p class="⭐️f0gmsw-0">Bien</p>
            </div>
          </div>
        <!--/qv-->
        <!--qv q:sstyle=⭐️f0gmsw-0 q:id=1 q:key=sX:-->
          <div class="⭐️f0gmsw-0 host">
            <div class="⭐️f0gmsw-0">
              Scoped2
              <p class="⭐️f0gmsw-0">Bien</p>
            </div>
          </div>
        <!--/qv-->
        </div>
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('component useClientEffect()', async () => {
  await testSSR(
    <UseClientEffect />,
    `<html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
        <div q:id="1" on:qvisible="/runtimeQRL#_[0]"></div>
      <!--/qv-->
    </html>`
  );
});

renderSSRSuite('nested html', async () => {
  await testSSR(
    <>
      <div></div>
    </>,
    `<html q:container="paused" q:version="dev" q:render="ssr"><div></div></html>`
  );
});

renderSSRSuite('root html component', async () => {
  await testSSR(
    <HeadCmp host:aria-hidden="true">
      <link>Stuff</link>
    </HeadCmp>,
    `
    <html q:container="paused" q:version="dev" q:render="ssr">
      <!--qv q:id=0 q:key=sX:-->
      <head q:id="1" q:head on:qvisible="/runtimeQRL#_[0]">
        <title q:head>hola</title>
        <!--qv q:sname q:sref=0 q:key-->
        <link q:head />
        <!--/qv-->
      </head>
      <!--/qv-->
    </html>
    `
  );
});

renderSSRSuite('fragment name', async () => {
  await testSSR(
    <>
      <Styles />
      <UseClientEffect></UseClientEffect>
    </>,
    `<container q:container="paused" q:version="dev" q:render="ssr" q:base="/manu/folder">
      <link rel="stylesheet" href="/global.css">
      <!--qv q:id=2 q:key=sX:-->
        <style q:style="17nc-0">.host {color: red}</style>
        <div class="host">Text</div>
      <!--/qv-->
      <!--qv q:id=0 q:key=sX:-->
        <div q:id="1" on:qvisible="/runtimeQRL#_[0]"></div>
      <!--/qv-->
    </container>`,
    {
      containerTagName: 'container',
      base: '/manu/folder',
      beforeContent: [<link rel="stylesheet" href="/global.css" />],
    }
  );
});

renderSSRSuite('ssr marks', async () => {
  await testSSR(
    <>
      {delay(100).then(() => (
        <li>1</li>
      ))}
      {delay(10).then(() => (
        <li>2</li>
      ))}
      <SSRComment data="here" />
      <div>
        <SSRComment data="i am" />
      </div>
      {delay(120).then(() => (
        <li>3</li>
      ))}
    </>,
    `<html q:container="paused" q:version="dev" q:render="ssr">
      <li>1</li>
      <li>2</li>
      <!--here-->
      <div>
        <!--i am-->
      </div>
      <li>3</li>
    </html>`
  );
});

renderSSRSuite('html slot', async () => {
  await testSSR(
    <HtmlContext>
      <head>
        <meta charSet="utf-8" />
        <title>Qwik</title>
      </head>
      <body>
        <div></div>
      </body>
    </HtmlContext>,
    `
    <html q:container="paused" q:version="dev" q:render="ssr" q:base="/manu/folder">
      <!--qv q:id=0 q:key=sX:-->
      <!--qv q:sname q:sref=0 q:key-->
      <head q:head>
        <meta charset="utf-8" q:head />
        <title q:head>Qwik</title>
        <link rel="stylesheet" href="/global.css" />
      </head>
      <body>
        <div></div>
      </body>
      <!--/qv-->
      <!--/qv-->
    </html>`,
    {
      beforeContent: [<link rel="stylesheet" href="/global.css" />],
      base: '/manu/folder',
    }
  );
});

renderSSRSuite('null component', async () => {
  await testSSR(
    <>
      <NullCmp />
    </>,
    `<html q:container="paused" q:version="dev" q:render="ssr"><!--qv q:id=0 q:key=sX:--><!--/qv--></html>`
  );
});
// TODO
// Merge props on host
// - host events
// - class
// - style
// Container with tagName
// End-to-end with qwikcity
// SVG rendering
// Performance metrics

renderSSRSuite.run();

export const MyCmp = component$((props: Record<string, any>) => {
  return (
    <section>
      <div>
        MyCmp
        {JSON.stringify(props)}
      </div>
    </section>
  );
});

export const MyCmpComplex = component$(() => {
  const ref = useRef();
  return (
    <div ref={ref} onClick$={() => console.warn('from component')}>
      <button onClick$={() => console.warn('click')}>Click</button>
      <Slot></Slot>
    </div>
  );
});

export const SimpleSlot = component$((props: { name: string }) => {
  return (
    <div id={props.name}>
      Before {props.name}
      <Slot></Slot>
      After {props.name}
    </div>
  );
});

export const MixedSlot = component$(() => {
  return (
    <SimpleSlot name="1">
      <Slot />
    </SimpleSlot>
  );
});

export const NamedSlot = component$(() => {
  return (
    <div>
      <Slot name="start" />
      <div>
        <Slot></Slot>
      </div>
      <Slot name="end" />
    </div>
  );
});

export const Events = component$(() => {
  useOn(
    'click',
    $(() => console.warn('click'))
  );
  useOnWindow(
    'click',
    $(() => console.warn('window:click'))
  );
  useOnDocument(
    'click',
    $(() => console.warn('document:click'))
  );

  return <div onClick$={() => console.warn('scroll')}></div>;
});

export const Styles = component$(() => {
  useStylesQrl(inlinedQrl('.host {color: red}', 'styles_987'));

  return <div class="host">Text</div>;
});

export const ScopedStyles1 = component$(() => {
  useStylesScopedQrl(inlinedQrl('.host {color: red}', 'styles_scoped_1'));

  return (
    <div class="host">
      <div>
        Scoped1
        <Slot></Slot>
        <p>Que tal?</p>
      </div>
      <ScopedStyles2 />
      <ScopedStyles2 />
    </div>
  );
});

export const ScopedStyles2 = component$(() => {
  useStylesScopedQrl(inlinedQrl('.host {color: blue}', '20_styles_scoped'));

  return (
    <div class="host">
      <div>
        Scoped2
        <p>Bien</p>
      </div>
    </div>
  );
});

const CTX_INTERNAL = createContext<{ value: string }>('internal');
const CTX_QWIK_CITY = createContext<{ value: string }>('qwikcity');

export const Context = component$(() => {
  useContextProvider(CTX_INTERNAL, {
    value: 'hello',
  });
  useContextProvider(CTX_QWIK_CITY, {
    value: 'bye',
  });
  return (
    <>
      <Slot />
      <ContextConsumer />
    </>
  );
});

export const ContextConsumer = component$(() => {
  const internal = useContext(CTX_INTERNAL);
  const qwikCity = useContext(CTX_QWIK_CITY);

  return (
    <>
      {internal.value} {qwikCity.value}
    </>
  );
});

export const UseClientEffect = component$(() => {
  useClientEffect$(() => {
    console.warn('client effect');
  });
  return <div />;
});

export const HeadCmp = component$(() => {
  useClientEffect$(() => {
    console.warn('client effect');
  });
  return (
    <head>
      <title>hola</title>
      <Slot></Slot>
    </head>
  );
});

export const HtmlContext = component$(() => {
  const store = useStore({});
  useContextProvider(CTX_INTERNAL, store);

  return <Slot />;
});
async function testSSR(
  node: JSXNode,
  expected: string | string[],
  opts?: Partial<RenderSSROptions>
) {
  const doc = createSimpleDocument() as Document;
  const chunks: string[] = [];
  const stream: StreamWriter = {
    write(chunk) {
      chunks.push(chunk);
    },
  };
  await renderSSR(doc, node, {
    stream,
    containerTagName: 'html',
    ...opts,
  });
  if (typeof expected === 'string') {
    const options = { parser: 'html', htmlWhitespaceSensitivity: 'ignore' } as const;
    snapshot(
      format(chunks.join(''), options),
      format(expected.replace(/(\n|^)\s+/gm, ''), options)
    );
  } else {
    equal(chunks, expected);
  }
}

export const DelayResource = component$((props: { text: string; delay: number }) => {
  useStylesQrl(inlinedQrl(`.cmp {background: blue}`, 'styles_DelayResource'));

  const resource = useResource$<string>(async ({ track }) => {
    track(props, 'text');
    await delay(props.delay);
    return props.text;
  });
  return (
    <div class="cmp">
      <Resource resource={resource} onResolved={(value) => <span>{value}</span>} />
    </div>
  );
});

export const NullCmp = component$(() => {
  return null;
});
